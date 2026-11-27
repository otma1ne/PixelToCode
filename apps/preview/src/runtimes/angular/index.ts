import type * as TS from "typescript";
import type { ApplicationRef } from "@angular/core";
import type { GeneratedFile } from "@pixeltocode/schema";
import { CompileError, type RenderResult } from "../types";
import {
  inlineResources,
  joinPath,
  MissingResourceError,
  signalMembersToDecorators,
} from "./transforms";

type Modules = Record<string, unknown>;

interface Toolchain {
  ts: typeof TS;
  modules: Modules;
  core: typeof import("@angular/core");
  platformBrowser: typeof import("@angular/platform-browser");
}

let toolchain: Promise<Toolchain> | null = null;

/** Loads TypeScript and Angular once. The JIT compiler must be registered before any component is compiled. */
function loadToolchain(): Promise<Toolchain> {
  toolchain ??= (async () => {
    const compiler = await import("@angular/compiler");
    const [tsModule, core, common, platformBrowser, rxjs, rxjsOperators] = await Promise.all([
      import("typescript"),
      import("@angular/core"),
      import("@angular/common"),
      import("@angular/platform-browser"),
      import("rxjs"),
      import("rxjs/operators"),
    ]);
    const ts = ((tsModule as { default?: typeof TS }).default ?? tsModule) as typeof TS;
    const modules: Modules = {
      "@angular/compiler": compiler,
      "@angular/core": core,
      "@angular/common": common,
      "@angular/platform-browser": platformBrowser,
      rxjs,
      "rxjs/operators": rxjsOperators,
    };
    return { ts, modules, core, platformBrowser };
  })();
  return toolchain;
}

let appRef: ApplicationRef | null = null;

function dirOf(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? "" : path.slice(0, i);
}

function transpile(tc: Toolchain, file: GeneratedFile, files: Map<string, string>): string {
  const { ts } = tc;
  const out = ts.transpileModule(file.content, {
    fileName: file.path,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      experimentalDecorators: true,
      useDefineForClassFields: false,
      sourceMap: false,
      inlineSourceMap: false,
    },
    transformers: {
      before: [
        inlineResources(ts, {
          dir: dirOf(file.path),
          file: file.path,
          readResource: (p) => files.get(p),
        }),
        signalMembersToDecorators(ts),
      ],
    },
  });
  const error = out.diagnostics?.find((d) => d.category === ts.DiagnosticCategory.Error);
  if (error) {
    const pos =
      error.file && error.start !== undefined
        ? error.file.getLineAndCharacterOfPosition(error.start)
        : null;
    const where = pos ? `:${pos.line + 1}:${pos.character + 1}` : "";
    throw new CompileError(
      `${file.path}${where} ${ts.flattenDiagnosticMessageText(error.messageText, "\n")}`,
      file.path,
    );
  }
  return out.outputText;
}

const TS_EXTENSIONS = ["", ".ts", "/index.ts"];

/** A tiny CommonJS loader over the generated files. Only allow-listed packages resolve. */
function createLoader(tc: Toolchain, files: Map<string, string>) {
  const cache = new Map<string, { exports: Record<string, unknown> }>();

  const load = (path: string): Record<string, unknown> => {
    const cached = cache.get(path);
    if (cached) return cached.exports;
    const content = files.get(path);
    if (content === undefined) throw new CompileError(`Cannot find ${path}`, path);
    const code = transpile(tc, { path, content }, files);
    const module = { exports: {} as Record<string, unknown> };
    cache.set(path, module);
    const require = (spec: string): unknown => {
      if (spec.startsWith(".")) {
        const base = joinPath(dirOf(path), spec);
        const target = TS_EXTENSIONS.map((ext) => base + ext).find((p) => files.has(p));
        if (!target) throw new CompileError(`${path}: cannot resolve "${spec}"`, path);
        return load(target);
      }
      if (spec in tc.modules) return tc.modules[spec];
      throw new CompileError(
        `${path}: the package "${spec}" is not available in the preview`,
        path,
      );
    };
    // Generated code runs only inside the sandboxed, network-less preview origin.
    const fn = new Function(
      "exports",
      "require",
      "module",
      `${code}\n//# sourceURL=pixeltocode:///${path}`,
    );
    fn(module.exports, require, module);
    return module.exports;
  };

  return load;
}

function findComponent(
  exports: Record<string, unknown>,
  entry: string,
): { type: unknown; selector: string } {
  for (const value of Object.values(exports)) {
    if (typeof value !== "function") continue;
    // Reading ɵcmp triggers the JIT compilation of the component and its template.
    const def = (value as { ɵcmp?: { selectors?: string[][] } }).ɵcmp;
    const selector = def?.selectors?.[0]?.[0];
    if (selector) return { type: value, selector };
  }
  throw new CompileError(`${entry} does not export a standalone component`, entry);
}

export async function renderAngular(
  root: HTMLElement,
  entry: string,
  generated: readonly GeneratedFile[],
): Promise<RenderResult> {
  const timings: Record<string, number> = {};
  let t = performance.now();
  const tc = await loadToolchain();
  timings.toolchain = performance.now() - t;

  appRef?.destroy();
  appRef = null;
  root.replaceChildren();

  t = performance.now();
  const files = new Map(generated.map((f) => [f.path, f.content]));
  let component: { type: unknown; selector: string };
  try {
    const exports = createLoader(tc, files)(entry);
    component = findComponent(exports, entry);
  } catch (err) {
    if (err instanceof CompileError) throw err;
    if (err instanceof MissingResourceError) throw new CompileError(err.message, err.file);
    throw new CompileError(err instanceof Error ? err.message : String(err), entry);
  }
  timings.compile = performance.now() - t;

  t = performance.now();
  if (component.selector.includes("[") || component.selector.includes(".")) {
    throw new CompileError(
      `The root component needs an element selector, got "${component.selector}"`,
      entry,
    );
  }
  root.append(document.createElement(component.selector));
  const { bootstrapApplication } = tc.platformBrowser;
  appRef = await bootstrapApplication(
    component.type as Parameters<typeof bootstrapApplication>[0],
    {
      providers: [tc.core.provideZonelessChangeDetection()],
    },
  );
  timings.bootstrap = performance.now() - t;
  return { timings };
}
