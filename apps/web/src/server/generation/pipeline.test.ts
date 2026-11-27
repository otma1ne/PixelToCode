import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { GenerationEvent } from "@pixeltocode/schema";
import { describe, expect, it } from "vitest";
import { ANGULAR_OUTPUT } from "./fixtures";
import { createMemoryLimitStore } from "./limits";
import { runGeneration, type PipelineDeps, type PipelineSummary } from "./pipeline";
import { ProviderTimeoutError, type ModelProvider, type ProviderResponse } from "./provider";

const PNG = new Uint8Array(
  readFileSync(join(__dirname, "../../../public/examples/invite-members.png")),
);
const settings = { framework: "angular", style: "scss", instructions: "" } as const;
const usage = { inputTokens: 2000, cachedInputTokens: 0, outputTokens: 3000 };
const ok = (text: string): ProviderResponse => ({ text, usage, incomplete: false });

function fakeProvider(
  ...answers: (ProviderResponse | Error)[]
): ModelProvider & { calls: number; notes: (string | undefined)[] } {
  const provider = {
    calls: 0,
    notes: [] as (string | undefined)[],
    async generate(req: { retryNote?: string }) {
      provider.notes.push(req.retryNote);
      const answer = answers[provider.calls++];
      if (!answer) throw new Error("no more answers");
      if (answer instanceof Error) throw answer;
      return answer;
    },
  };
  return provider;
}

function deps(provider: ModelProvider | null, overrides: Partial<PipelineDeps> = {}): PipelineDeps {
  return {
    provider,
    prices: { input: 2, cachedInput: 0.5, output: 8 },
    limits: createMemoryLimitStore({ perDay: 5, perMinute: 3 }),
    budgetUsd: 18,
    maxOutputTokens: 16_000,
    now: () => new Date("2026-11-27T15:00:00Z"),
    ...overrides,
  };
}

async function collect(gen: AsyncGenerator<GenerationEvent>) {
  const events: GenerationEvent[] = [];
  for await (const e of gen) events.push(e);
  return events;
}

const input = { image: PNG, settings, visitor: "v1" };

describe("runGeneration", () => {
  it("emits every stage in order and returns the normalised result with its cost", async () => {
    let summary: PipelineSummary | undefined;
    const events = await collect(
      runGeneration(
        input,
        deps(fakeProvider(ok(JSON.stringify(ANGULAR_OUTPUT)))),
        (s) => (summary = s),
      ),
    );
    const steps = events.filter((e) => e.type === "step").map((e) => `${e.step}:${e.status}`);
    expect(steps).toEqual([
      "checks:running",
      "checks:done",
      "image:running",
      "image:done",
      "model:running",
      "model:done",
      "validate:running",
      "validate:done",
      "normalize:running",
      "normalize:done",
    ]);
    const last = events.at(-1);
    expect(last?.type).toBe("result");
    if (last?.type !== "result") return;
    expect(last.result.componentName).toBe("InviteMembersCard");
    expect(last.result.removedDependencies).toEqual(["@angular/material"]);
    expect(last.result.usage.costUsd).toBeCloseTo((2000 * 2 + 3000 * 8) / 1e6);
    expect(summary).toMatchObject({ status: "ok", attempts: 1 });
  });

  it("retries once with the problem when the first answer is unusable", async () => {
    const provider = fakeProvider(ok("{not json"), ok(JSON.stringify(ANGULAR_OUTPUT)));
    const events = await collect(runGeneration(input, deps(provider)));
    expect(events.at(-1)?.type).toBe("result");
    expect(provider.calls).toBe(2);
    expect(provider.notes[1]).toMatch(/not valid JSON/);
  });

  it("gives up after a second unusable answer and still counts the spend", async () => {
    const limits = createMemoryLimitStore({ perDay: 5, perMinute: 3 });
    const bad = { ...ANGULAR_OUTPUT, files: [{ path: "../x.ts", content: "" }] };
    const events = await collect(
      runGeneration(
        input,
        deps(fakeProvider(ok(JSON.stringify(bad)), ok(JSON.stringify(bad))), { limits }),
      ),
    );
    expect(events.at(-1)).toMatchObject({ type: "error", code: "invalid_output" });
    expect(await limits.monthSpendUsd(new Date("2026-11-27T15:00:00Z"))).toBeCloseTo(
      (2 * (2000 * 2 + 3000 * 8)) / 1e6,
    );
  });

  it("treats a cut answer as unusable", async () => {
    const cut = { text: "{", usage, incomplete: true };
    const events = await collect(runGeneration(input, deps(fakeProvider(cut, cut))));
    expect(events.at(-1)).toMatchObject({ type: "error", code: "invalid_output" });
  });

  it("reports timeouts and provider errors with typed codes", async () => {
    const timeout = await collect(
      runGeneration(input, deps(fakeProvider(new ProviderTimeoutError("t")))),
    );
    expect(timeout.at(-1)).toMatchObject({ type: "error", code: "model_timeout" });
    const failure = await collect(runGeneration(input, deps(fakeProvider(new Error("boom")))));
    expect(failure.at(-1)).toMatchObject({ type: "error", code: "model_error" });
  });

  it("stops at the daily limit with the reset time", async () => {
    const limits = createMemoryLimitStore({ perDay: 1, perMinute: 3 });
    await limits.consume("v1", new Date("2026-11-27T15:00:00Z"));
    const events = await collect(runGeneration(input, deps(fakeProvider(), { limits })));
    expect(events.at(-1)).toEqual({
      type: "error",
      code: "limit_reached",
      message: "You have used all your generations for today.",
      resetAt: "2026-11-28T00:00:00.000Z",
    });
  });

  it("stops before the call when the monthly budget could be exceeded", async () => {
    const limits = createMemoryLimitStore({ perDay: 5, perMinute: 3 });
    await limits.addSpendUsd(17.9, new Date("2026-11-27T15:00:00Z"));
    const provider = fakeProvider(ok(JSON.stringify(ANGULAR_OUTPUT)));
    const events = await collect(runGeneration(input, deps(provider, { limits })));
    expect(events.at(-1)).toMatchObject({ type: "error", code: "budget_exhausted" });
    expect(provider.calls).toBe(0);
  });

  it("refuses an invalid image before calling the model", async () => {
    const provider = fakeProvider(ok(JSON.stringify(ANGULAR_OUTPUT)));
    const events = await collect(
      runGeneration({ ...input, image: new TextEncoder().encode("%PDF-1.7") }, deps(provider)),
    );
    expect(events.at(-1)).toMatchObject({ type: "error", code: "invalid_image" });
    expect(provider.calls).toBe(0);
  });

  it("reports a missing configuration", async () => {
    const events = await collect(runGeneration(input, deps(null)));
    expect(events.at(-1)).toMatchObject({ type: "error", code: "not_configured" });
  });
});
