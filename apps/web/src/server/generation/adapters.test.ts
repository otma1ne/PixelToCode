import { describe, expect, it } from "vitest";
import { allowedDependencies, kebab, normalizeOutput, NormalizeError } from "./adapters";
import { ANGULAR_OUTPUT } from "./fixtures";

const angular = { framework: "angular", style: "scss", instructions: "" } as const;

describe("kebab", () => {
  it("turns PascalCase into kebab-case", () => {
    expect(kebab("InviteMembersCard")).toBe("invite-members-card");
    expect(kebab("HTMLPreview")).toBe("html-preview");
  });
});

describe("normalizeOutput", () => {
  it("keeps valid Angular files, finds the entry and pins dependencies", () => {
    const result = normalizeOutput(ANGULAR_OUTPUT, angular);
    expect(result.entry).toBe("src/app/invite-members-card/invite-members-card.component.ts");
    expect(result.files).toHaveLength(4);
    expect(result.dependencies).toEqual([
      { name: "@angular/core", version: "22.2.6" },
      { name: "@angular/common", version: "22.2.6" },
      { name: "sass", version: "1.93.2" },
    ]);
    expect(result.removedDependencies).toEqual(["@angular/material"]);
  });

  it("moves bare file names into the component folder", () => {
    const output = {
      ...ANGULAR_OUTPUT,
      files: ANGULAR_OUTPUT.files.map((f) => ({ ...f, path: f.path.split("/").pop() ?? "" })),
    };
    const result = normalizeOutput(output, angular);
    expect(result.files[0]?.path).toBe(
      "src/app/invite-members-card/invite-members-card.component.ts",
    );
  });

  it("rejects unsafe paths", () => {
    const output = {
      ...ANGULAR_OUTPUT,
      files: [...ANGULAR_OUTPUT.files, { path: "../../etc/evil.ts", content: "" }],
    };
    expect(() => normalizeOutput(output, angular)).toThrow(NormalizeError);
  });

  it("rejects a missing entry file and a bad component name", () => {
    expect(() =>
      normalizeOutput({ ...ANGULAR_OUTPUT, files: ANGULAR_OUTPUT.files.slice(1) }, angular),
    ).toThrow(/entry file/);
    expect(() =>
      normalizeOutput({ ...ANGULAR_OUTPUT, componentName: "invite card" }, angular),
    ).toThrow(/PascalCase/);
  });

  it("rejects more than 12 files and duplicates", () => {
    const many = Array.from({ length: 13 }, (_, i) => ({
      path: `src/app/x/f${i}.ts`,
      content: "",
    }));
    expect(() => normalizeOutput({ ...ANGULAR_OUTPUT, files: many }, angular)).toThrow(
      /limit is 12/,
    );
    const dup = [...ANGULAR_OUTPUT.files, ANGULAR_OUTPUT.files[0]!];
    expect(() => normalizeOutput({ ...ANGULAR_OUTPUT, files: dup }, angular)).toThrow(/Duplicate/);
  });

  it("expects index.html for plain HTML", () => {
    const html = { framework: "html", style: "css", instructions: "" } as const;
    const result = normalizeOutput(
      {
        ...ANGULAR_OUTPUT,
        files: [
          { path: "index.html", content: "<h1>Hi</h1>" },
          { path: "styles.css", content: "h1{}" },
        ],
        dependencies: [],
      },
      html,
    );
    expect(result.entry).toBe("index.html");
    expect(result.dependencies).toEqual([]);
  });
});

describe("allowedDependencies", () => {
  it("adds tailwindcss for Tailwind and sass for SCSS", () => {
    expect(
      Object.keys(allowedDependencies({ framework: "react", style: "tailwind", instructions: "" })),
    ).toEqual(["react", "react-dom", "tailwindcss"]);
    expect(
      Object.keys(allowedDependencies({ framework: "vue", style: "scss", instructions: "" })),
    ).toEqual(["vue", "sass"]);
  });
});
