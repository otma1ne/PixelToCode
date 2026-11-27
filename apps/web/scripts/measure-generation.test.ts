/**
 * Measures the real cost and time of a generation against the OpenAI API.
 * This is the only test that spends credits: about four generations per run.
 *
 *   pnpm --filter web measure
 *
 * Reads apps/web/.env.local (OPENAI_API_KEY, OPENAI_MODEL and the two OPENAI_PRICE_* values).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadEnvConfig } from "@next/env";
import type { GenerationEvent, GenerationSettings } from "@pixeltocode/schema";
import { expect, it } from "vitest";

loadEnvConfig(join(__dirname, ".."));

const CASES: GenerationSettings[] = [
  { framework: "angular", style: "scss", instructions: "" },
  { framework: "react", style: "tailwind", instructions: "" },
  { framework: "vue", style: "css", instructions: "" },
  { framework: "html", style: "css", instructions: "" },
];

const configured = Boolean(
  process.env.OPENAI_API_KEY &&
    process.env.OPENAI_MODEL &&
    process.env.OPENAI_PRICE_INPUT_PER_MTOK &&
    process.env.OPENAI_PRICE_OUTPUT_PER_MTOK,
);

it.skipIf(!configured)(
  "measures one generation per framework on the example screenshot",
  async () => {
    // Imported after the environment is loaded.
    const { serverConfig } = await import("@/server/generation/deps");
    const { createMemoryLimitStore } = await import("@/server/generation/limits");
    const { runGeneration } = await import("@/server/generation/pipeline");
    const config = serverConfig();
    const deps = {
      ...config.deps,
      limits: createMemoryLimitStore({ perDay: 100, perMinute: 100 }),
    };
    const image = new Uint8Array(
      readFileSync(join(__dirname, "../public/examples/invite-members.png")),
    );

    const rows: Record<string, string | number>[] = [];
    for (const settings of CASES) {
      let last: GenerationEvent | undefined;
      let summary = {
        attempts: 0,
        durationMs: 0,
        costUsd: 0,
        usage: { inputTokens: 0, outputTokens: 0 },
      };
      for await (const event of runGeneration(
        { image, settings, visitor: "measure" },
        deps,
        (s) => {
          summary = s;
        },
      )) {
        last = event;
      }
      rows.push({
        case: `${settings.framework} + ${settings.style}`,
        outcome: last?.type === "result" ? "ok" : last?.type === "error" ? last.code : "none",
        files: last?.type === "result" ? last.result.files.length : 0,
        attempts: summary.attempts,
        seconds: Number((summary.durationMs / 1000).toFixed(1)),
        inputTokens: summary.usage.inputTokens,
        outputTokens: summary.usage.outputTokens,
        costUsd: Number(summary.costUsd.toFixed(4)),
      });
    }
    console.table(rows);
    const total = rows.reduce((sum, r) => sum + Number(r.costUsd), 0);
    const average = total / rows.length;
    console.log(
      `Model ${process.env.OPENAI_MODEL}: average ${average.toFixed(4)} USD per generation, ` +
        `about ${Math.floor(Number(process.env.MONTHLY_BUDGET_USD ?? 18) / average)} generations for the monthly budget.`,
    );
    expect(rows.length).toBe(CASES.length);
  },
  10 * 60_000,
);
