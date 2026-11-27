import { describe, expect, it } from "vitest";
import { checkScreenshotFile } from "./read-screenshot";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const PDF = new TextEncoder().encode("%PDF-1.7 ....");

describe("checkScreenshotFile", () => {
  it("accepts a PNG under 5 MB", () => {
    expect(checkScreenshotFile({ name: "card.png", size: 90_720, head: PNG })).toEqual({
      ok: true,
      type: "image/png",
    });
  });

  it("rejects a file over 5 MB with its size", () => {
    expect(checkScreenshotFile({ name: "big.png", size: 6 * 1024 * 1024, head: PNG })).toEqual({
      ok: false,
      error: "big.png is 6.0 MB. The limit is 5 MB.",
    });
  });

  it("rejects a renamed file by its content", () => {
    expect(checkScreenshotFile({ name: "notes.png", size: 2000, head: PDF })).toEqual({
      ok: false,
      error: "notes.png is not a PNG, JPEG or WebP image.",
    });
  });

  it("names pasted images without a file name", () => {
    expect(checkScreenshotFile({ name: "", size: 0, head: PNG })).toEqual({
      ok: false,
      error: "The pasted image is empty.",
    });
  });
});
