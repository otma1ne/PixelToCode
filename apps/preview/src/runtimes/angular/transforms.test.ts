import ts from "typescript";
import { describe, expect, it } from "vitest";
import {
  inlineResources,
  joinPath,
  MissingResourceError,
  signalMembersToDecorators,
} from "./transforms";

function compile(source: string, resources: Record<string, string> = {}) {
  return ts.transpileModule(source, {
    fileName: "src/app/card/card.component.ts",
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      experimentalDecorators: true,
      useDefineForClassFields: false,
    },
    transformers: {
      before: [
        inlineResources(ts, {
          dir: "src/app/card",
          file: "src/app/card/card.component.ts",
          readResource: (p) => resources[p],
        }),
        signalMembersToDecorators(ts),
      ],
    },
  }).outputText;
}

describe("joinPath", () => {
  it("resolves relative segments", () => {
    expect(joinPath("src/app/card", "./card.html")).toBe("src/app/card/card.html");
    expect(joinPath("src/app/card", "../shared/x.css")).toBe("src/app/shared/x.css");
    expect(joinPath("", "a.ts")).toBe("a.ts");
  });
});

describe("inlineResources", () => {
  it("inlines templateUrl and styleUrl", () => {
    const out = compile(
      `@Component({ selector: "app-card", templateUrl: "./card.html", styleUrl: "./card.css" })
       export class Card {}`,
      { "src/app/card/card.html": "<p>Hi</p>", "src/app/card/card.css": "p { color: red; }" },
    );
    expect(out).toContain(`template: "<p>Hi</p>"`);
    expect(out).toContain(`styles: ["p { color: red; }"]`);
    expect(out).not.toContain("templateUrl");
  });

  it("inlines styleUrls", () => {
    const out = compile(
      `@Component({ selector: "app-card", template: "", styleUrls: ["./a.css", "./b.css"] })
       export class Card {}`,
      { "src/app/card/a.css": "a{}", "src/app/card/b.css": "b{}" },
    );
    expect(out).toContain(`styles: ["a{}", "b{}"]`);
  });

  it("reports a missing template", () => {
    expect(() =>
      compile(`@Component({ selector: "x-y", templateUrl: "./missing.html" }) export class C {}`),
    ).toThrow(MissingResourceError);
  });
});

describe("signalMembersToDecorators", () => {
  it("adds @Input to signal inputs and models, @Output to outputs and models", () => {
    const out = compile(`
      export class C {
        a = input(0);
        b = input.required<string>({ alias: "bee" });
        c = model(false);
        d = output<void>();
        e = signal(1);
      }`);
    expect(out).toContain(
      `Input({ isSignal: true, alias: "a", required: false, transform: undefined })`,
    );
    expect(out).toContain(
      `Input({ isSignal: true, alias: "bee", required: true, transform: undefined })`,
    );
    expect(out).toContain(
      `Input({ isSignal: true, alias: "c", required: false, transform: undefined })`,
    );
    expect(out).toContain(`Output("cChange")`);
    expect(out).toContain(`Output("d")`);
    expect(out).not.toContain(`alias: "e"`);
  });
});
