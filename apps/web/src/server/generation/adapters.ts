import {
  checkPath,
  FRAMEWORK_LABELS,
  MAX_FILES,
  STYLE_LABELS,
  type Dependency,
  type Framework,
  type GeneratedFile,
  type GenerationSettings,
  type ModelOutput,
  type StyleSystem,
} from "@pixeltocode/schema";

/** Versions written into exports. Only these packages may appear in a generated component. */
const PINNED = {
  "@angular/core": "22.2.6",
  "@angular/common": "22.2.6",
  react: "19.3.0",
  "react-dom": "19.3.0",
  vue: "3.5.22",
  tailwindcss: "4.3.3",
  sass: "1.93.2",
} as const;

export class NormalizeError extends Error {}

export interface NormalizedOutput {
  componentName: string;
  summary: string;
  entry: string;
  files: GeneratedFile[];
  subcomponents: string[];
  dependencies: Dependency[];
  removedDependencies: string[];
  assumptions: string[];
}

export interface FrameworkAdapter {
  framework: Framework;
  /** Folder that holds the component, with a trailing slash ("" for plain HTML). */
  baseDir: (componentName: string) => string;
  /** The file the preview mounts. */
  entry: (componentName: string) => string;
  core: readonly (keyof typeof PINNED)[];
  rules: (style: StyleSystem) => string;
}

export const kebab = (name: string) =>
  name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();

const styleExt = (style: StyleSystem) => (style === "scss" ? "scss" : "css");

const STYLE_RULES: Record<StyleSystem, string> = {
  css: "Style with plain CSS in separate stylesheet files. Use class names, CSS custom properties for the colours you reuse, and flexbox or grid for layout.",
  scss: "Style with SCSS in separate stylesheet files. Use nesting sparingly, variables for the colours you reuse, and flexbox or grid for layout.",
  tailwind:
    "Style with Tailwind CSS v4 utility classes in the markup. Do not write a stylesheet unless a style cannot be expressed with utilities. Do not add a tailwind.config file.",
};

export const ADAPTERS: Record<Framework, FrameworkAdapter> = {
  angular: {
    framework: "angular",
    baseDir: (name) => `src/app/${kebab(name)}/`,
    entry: (name) => `src/app/${kebab(name)}/${kebab(name)}.component.ts`,
    core: ["@angular/core", "@angular/common"],
    rules: (style) =>
      [
        "Write Angular 22 standalone components. Do not write NgModules and do not set standalone: true, it is the default.",
        "Use signals for state, input() and input.required() for inputs, output() for outputs, and computed() for derived values.",
        "Use the built-in control flow (@if, @for with track, @switch). Do not use *ngIf or *ngFor.",
        "Set changeDetection: ChangeDetectionStrategy.OnPush. Do not depend on zone.js.",
        style === "tailwind"
          ? "Put the template in templateUrl. No component stylesheet unless needed."
          : `Put the template in templateUrl and the styles in styleUrl (.${styleExt(style)}).`,
        "Name files <kebab-name>.component.ts / .html / .<style>. Put each subcomponent in its own folder next to the root component folder, under src/app/.",
        "Import only from @angular/core and @angular/common.",
      ].join("\n"),
  },
  react: {
    framework: "react",
    baseDir: (name) => `src/components/${name}/`,
    entry: (name) => `src/components/${name}/${name}.tsx`,
    core: ["react", "react-dom"],
    rules: (style) =>
      [
        "Write React 19 function components in TypeScript (.tsx) with a typed props interface for each component.",
        "Export each component as a named export. One component per file.",
        style === "tailwind"
          ? "Use className with Tailwind utilities."
          : `Import a .${styleExt(style)} stylesheet next to the component and use plain class names.`,
        "Put each subcomponent in its own folder under src/components/.",
        "Import only from react.",
      ].join("\n"),
  },
  vue: {
    framework: "vue",
    baseDir: (name) => `src/components/${name}/`,
    entry: (name) => `src/components/${name}/${name}.vue`,
    core: ["vue"],
    rules: (style) =>
      [
        'Write Vue 3.5 single-file components with <script setup lang="ts">, typed defineProps and defineEmits.',
        style === "tailwind"
          ? "Use Tailwind utilities in the template."
          : `Use a scoped <style${style === "scss" ? ' lang="scss"' : ""}> block in each component.`,
        "Put each subcomponent in its own folder under src/components/.",
        "Import only from vue.",
      ].join("\n"),
  },
  html: {
    framework: "html",
    baseDir: () => "",
    entry: () => "index.html",
    core: [],
    rules: (style) =>
      [
        "Write one index.html page with semantic HTML5.",
        style === "tailwind"
          ? 'Load Tailwind with <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4.3.3"></script> in the head and style with utilities.'
          : "Put the styles in styles.css, linked from index.html.",
        "Add a small script.js only if the component needs behaviour.",
      ].join("\n"),
  },
};

export function allowedDependencies(settings: GenerationSettings): Record<string, string> {
  const adapter = ADAPTERS[settings.framework];
  const names: (keyof typeof PINNED)[] = [...adapter.core];
  if (settings.style === "tailwind" && settings.framework !== "html") names.push("tailwindcss");
  if (settings.style === "scss") names.push("sass");
  return Object.fromEntries(names.map((n) => [n, PINNED[n]]));
}

export function frameworkRules(settings: GenerationSettings): string {
  return [
    `Framework: ${FRAMEWORK_LABELS[settings.framework]}. Styling: ${STYLE_LABELS[settings.style]}.`,
    ADAPTERS[settings.framework].rules(settings.style),
    STYLE_RULES[settings.style],
  ].join("\n");
}

function cleanPath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^(\.\/)+/, "");
}

/**
 * Checks the model output against the framework's rules: valid component name, safe paths,
 * the expected entry file, at most 12 files, and only allow-listed dependencies at pinned versions.
 * Throws NormalizeError when the output cannot be used.
 */
export function normalizeOutput(
  output: ModelOutput,
  settings: GenerationSettings,
): NormalizedOutput {
  const adapter = ADAPTERS[settings.framework];
  const name = output.componentName.trim();
  if (!/^[A-Z][A-Za-z0-9]*$/.test(name)) {
    throw new NormalizeError(`"${name}" is not a PascalCase component name`);
  }
  if (output.files.length === 0) throw new NormalizeError("No files were returned");
  if (output.files.length > MAX_FILES) {
    throw new NormalizeError(
      `${output.files.length} files were returned, the limit is ${MAX_FILES}`,
    );
  }

  const base = adapter.baseDir(name);
  const seen = new Set<string>();
  const files = output.files.map((file) => {
    let path = cleanPath(file.path);
    if (!path.includes("/") && base) path = base + path;
    const problem = checkPath(path, settings.framework);
    if (problem) throw new NormalizeError(`Unsafe or unexpected path "${file.path}" (${problem})`);
    if (seen.has(path)) throw new NormalizeError(`Duplicate file "${path}"`);
    seen.add(path);
    return { path, content: file.content };
  });

  const entry = adapter.entry(name);
  if (!seen.has(entry)) throw new NormalizeError(`The entry file ${entry} is missing`);

  const allowed = allowedDependencies(settings);
  const removedDependencies = output.dependencies
    .map((d) => d.name.trim())
    .filter((n) => n && !(n in allowed));

  return {
    componentName: name,
    summary: output.summary.trim().slice(0, 500),
    entry,
    files,
    subcomponents: output.subcomponents.filter((s) => /^[A-Z][A-Za-z0-9]*$/.test(s)).slice(0, 12),
    dependencies: Object.entries(allowed).map(([n, version]) => ({ name: n, version })),
    removedDependencies: [...new Set(removedDependencies)],
    assumptions: output.assumptions.map((a) => a.slice(0, 500)).slice(0, 20),
  };
}
