import { describe, expect, it } from "vitest";
import {
  checkPath,
  formatBytes,
  GenerationSettings,
  HostToPreviewMessage,
  isSupportedCombination,
  MAX_FILES,
  MAX_INSTRUCTIONS_LENGTH,
  PreviewToHostMessage,
  sniffImageType,
  unsupportedReason,
} from "./index";

describe("framework and style combinations", () => {
  it("rejects SCSS for plain HTML and explains why", () => {
    expect(isSupportedCombination("html", "css")).toBe(true);
    expect(isSupportedCombination("html", "tailwind")).toBe(true);
    expect(isSupportedCombination("html", "scss")).toBe(false);
    expect(unsupportedReason("html", "scss")).toBe("HTML has no SCSS build step");
    expect(unsupportedReason("angular", "scss")).toBeNull();
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

describe("GenerationSettings", () => {
  it("accepts a supported combination", () => {
    const parsed = GenerationSettings.safeParse({
      framework: "vue",
      style: "tailwind",
      instructions: "",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects an unsupported combination and long instructions", () => {
    expect(
      GenerationSettings.safeParse({ framework: "html", style: "scss", instructions: "" }).success,
    ).toBe(false);
    expect(
      GenerationSettings.safeParse({
        framework: "react",
        style: "css",
        instructions: "x".repeat(MAX_INSTRUCTIONS_LENGTH + 1),
      }).success,
    ).toBe(false);
  });
});

describe("sniffImageType", () => {
  const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(12).fill(0)]);

  it("recognises PNG, JPEG and WebP by their signature", () => {
    expect(sniffImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png");
    expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(sniffImageType(bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50))).toBe(
      "image/webp",
    );
  });

  it("rejects other files, whatever their name", () => {
    expect(sniffImageType(bytes(0x47, 0x49, 0x46, 0x38))).toBeNull(); // GIF
    expect(sniffImageType(new TextEncoder().encode("<svg xmlns="))).toBeNull();
    expect(sniffImageType(new Uint8Array())).toBeNull();
  });
});

describe("formatBytes", () => {
  it("formats kilobytes and megabytes", () => {
    expect(formatBytes(90_720)).toBe("89 KB");
    expect(formatBytes(6 * 1024 * 1024)).toBe("6.0 MB");
    expect(formatBytes(10)).toBe("1 KB");
  });
});
