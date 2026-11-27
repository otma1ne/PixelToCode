import { describe, expect, it } from "vitest";
import {
  canGenerate,
  generationEvent,
  generationStarted,
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

describe("generation transitions", () => {
  const uploaded = screenshotAccepted(INITIAL_WORKSPACE, shot);
  const result = {
    componentName: "InviteMembersCard",
    summary: "Card",
    entry: "src/app/invite-members-card/invite-members-card.component.ts",
    files: [{ path: "src/app/invite-members-card/invite-members-card.component.ts", content: "" }],
    subcomponents: [],
    dependencies: [],
    removedDependencies: [],
    assumptions: [],
    durationMs: 4300,
    usage: { inputTokens: 1, cachedInputTokens: 0, outputTokens: 1, costUsd: 0 },
  };

  it("records the request, then each step with its time, then the result", () => {
    let s = generationStarted(uploaded);
    expect(s.phase).toBe("generating");
    expect(s.request).toEqual(uploaded.settings);
    expect(canGenerate(s)).toBe(false);
    s = generationEvent(s, { type: "step", step: "checks", status: "running" });
    s = generationEvent(s, { type: "step", step: "checks", status: "done", ms: 12 });
    s = generationEvent(s, { type: "step", step: "image", status: "running" });
    expect(s.steps).toEqual([
      { step: "checks", status: "done", ms: 12 },
      { step: "image", status: "running", ms: undefined },
    ]);
    s = generationEvent(s, { type: "result", result });
    expect(s.phase).toBe("ready");
    expect(projectName(s)).toBe("InviteMembersCard");
  });

  it("separates limits from failures", () => {
    const started = generationStarted(uploaded);
    expect(
      generationEvent(started, { type: "error", code: "limit_reached", message: "m", resetAt: "x" })
        .phase,
    ).toBe("limitReached");
    expect(
      generationEvent(started, { type: "error", code: "model_timeout", message: "m" }).phase,
    ).toBe("failed");
  });

  it("ignores a new screenshot during a generation, and clears the result after", () => {
    const started = generationStarted(uploaded);
    expect(screenshotAccepted(started, { ...shot, name: "other.png" })).toBe(started);
    const ready = generationEvent(started, { type: "result", result });
    const next = screenshotAccepted(ready, { ...shot, name: "other.png" });
    expect(next.result).toBeNull();
    expect(next.phase).toBe("uploaded");
  });
});
