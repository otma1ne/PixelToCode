import { describe, expect, it } from "vitest";
import {
  checkPath,
  HostToPreviewMessage,
  isSupportedCombination,
  MAX_FILES,
  PreviewToHostMessage,
} from "./index";

describe("framework and style combinations", () => {
  it("rejects SCSS and Tailwind for plain HTML", () => {
    expect(isSupportedCombination("html", "css")).toBe(true);
    expect(isSupportedCombination("html", "scss")).toBe(false);
    expect(isSupportedCombination("html", "tailwind")).toBe(false);
  });

  it("accepts every style for Angular, React and Vue", () => {
    for (const fw of ["angular", "react", "vue"] as const) {
      for (const style of ["css", "scss", "tailwind"] as const) {
        expect(isSupportedCombination(fw, style)).toBe(true);
      }
    }
  });
});

describe("checkPath", () => {
  it("accepts relative paths with allowed extensions", () => {
    expect(
      checkPath("src/app/invite-members-card/invite-members-card.component.ts", "angular"),
    ).toBeNull();
    expect(checkPath("InviteMembersCard.tsx", "react")).toBeNull();
  });

  it("rejects unsafe paths", () => {
    expect(checkPath("", "react")).toBe("empty");
    expect(checkPath("/etc/passwd.ts", "react")).toBe("absolute");
    expect(checkPath("C:/x.ts", "react")).toBe("absolute");
    expect(checkPath("src/../x.ts", "react")).toBe("parent_segment");
    expect(checkPath("src/my file.ts", "react")).toBe("invalid_segment");
    expect(checkPath("src/x.vue", "react")).toBe("extension_not_allowed");
    expect(checkPath("Makefile", "html")).toBe("extension_not_allowed");
  });
});

describe("preview messages", () => {
  const file = { path: "app.component.ts", content: "" };

  it("parses a render message", () => {
    const msg = HostToPreviewMessage.parse({
      type: "render",
      id: "1",
      framework: "angular",
      style: "css",
      entry: "app.component.ts",
      files: [file],
    });
    expect(msg.type).toBe("render");
  });

  it("rejects too many files", () => {
    const files = Array.from({ length: MAX_FILES + 1 }, (_, i) => ({
      path: `f${i}.ts`,
      content: "",
    }));
    const result = HostToPreviewMessage.safeParse({
      type: "render",
      id: "1",
      framework: "react",
      style: "css",
      entry: "f0.ts",
      files,
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown message types from the iframe", () => {
    const result = PreviewToHostMessage.safeParse({ type: "navigate", url: "https://example.com" });
    expect(result.success).toBe(false);
  });
});
