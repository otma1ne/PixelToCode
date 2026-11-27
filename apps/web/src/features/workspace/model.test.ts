import { describe, expect, it } from "vitest";
import {
  canGenerate,
  frameworkChanged,
  INITIAL_WORKSPACE,
  instructionsChanged,
  projectName,
  screenshotAccepted,
  screenshotRejected,
  screenshotRemoved,
  styleChanged,
  type Screenshot,
} from "./model";

const shot: Screenshot = {
  src: "/examples/invite-members.png",
  name: "invite-members.png",
  type: "image/png",
  bytes: 90_720,
  width: 1280,
  height: 1232,
  example: true,
};

describe("screenshot transitions", () => {
  it("moves to uploaded and clears a previous error", () => {
    const rejected = screenshotRejected(
      INITIAL_WORKSPACE,
      "notes.pdf is not a PNG, JPEG or WebP image.",
    );
    const next = screenshotAccepted(rejected, shot);
    expect(next.phase).toBe("uploaded");
    expect(next.imageError).toBeNull();
    expect(canGenerate(next)).toBe(true);
    expect(projectName(next)).toBe("invite-members");
  });

  it("keeps the current screenshot when a new file is rejected", () => {
    const next = screenshotRejected(screenshotAccepted(INITIAL_WORKSPACE, shot), "Too large");
    expect(next.screenshot).toBe(shot);
    expect(next.imageError).toBe("Too large");
  });

  it("returns to empty on removal", () => {
    const next = screenshotRemoved(screenshotAccepted(INITIAL_WORKSPACE, shot));
    expect(next.phase).toBe("empty");
    expect(canGenerate(next)).toBe(false);
    expect(projectName(next)).toBe("New component");
  });
});

describe("settings transitions", () => {
  it("falls back to CSS when switching from SCSS to HTML", () => {
    const next = frameworkChanged(INITIAL_WORKSPACE, "html");
    expect(INITIAL_WORKSPACE.settings.style).toBe("scss");
    expect(next.settings).toMatchObject({ framework: "html", style: "css" });
  });

  it("keeps Tailwind when switching to HTML", () => {
    const tailwind = styleChanged(INITIAL_WORKSPACE, "tailwind");
    expect(frameworkChanged(tailwind, "html").settings.style).toBe("tailwind");
  });

  it("ignores an unsupported style", () => {
    const html = frameworkChanged(INITIAL_WORKSPACE, "html");
    expect(styleChanged(html, "scss")).toBe(html);
  });

  it("caps instructions at 500 characters", () => {
    const next = instructionsChanged(INITIAL_WORKSPACE, "a".repeat(600));
    expect(next.settings.instructions).toHaveLength(500);
  });
});
