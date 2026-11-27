import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("keeps a design system text style and a text colour together", () => {
    expect(cn("text-body", "text-ink")).toBe("text-body text-ink");
  });

  it("lets the later text style win", () => {
    expect(cn("text-body", "text-caption")).toBe("text-caption");
  });

  it("lets the later colour win", () => {
    expect(cn("text-ink", "text-muted")).toBe("text-muted");
  });
});
