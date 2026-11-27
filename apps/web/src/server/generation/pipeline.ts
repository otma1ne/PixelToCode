import {
  GenerationResult,
  ModelOutput,
  type GenerationEvent,
  type GenerationSettings,
  type GenerationStep,
} from "@pixeltocode/schema";
import { normalizeOutput, NormalizeError, type NormalizedOutput } from "./adapters";
import { costUsd, worstCaseCostUsd, type Prices } from "./cost";
import { ImageError, prepareImage } from "./image";
import { nextUtcMonth, type LimitStore } from "./limits";
import { retryNote, systemPrompt, userPrompt } from "./prompt";
import {
  ProviderTimeoutError,
  type ModelProvider,
  type ProviderResponse,
  type ProviderUsage,
} from "./provider";

export interface PipelineDeps {
  /** Null when OpenAI is not configured. */
  provider: ModelProvider | null;
  prices: Prices | null;
  limits: LimitStore;
  budgetUsd: number;
  maxOutputTokens: number;
  now?: () => Date;
  clock?: () => number;
}

export interface PipelineInput {
  image: Uint8Array;
  settings: GenerationSettings;
  visitor: string;
  signal?: AbortSignal;
}

/** Outcome kept for the structured log line: never the image or the code. */
export interface PipelineSummary {
  status: "ok" | "error";
  code?: string;
  attempts: number;
  durationMs: number;
  usage: ProviderUsage;
  costUsd: number;
}

type ParseOutcome = { ok: true; value: NormalizedOutput } | { ok: false; problem: string };

function parse(response: ProviderResponse, settings: GenerationSettings): ParseOutcome {
  if (response.incomplete) return { ok: false, problem: "the answer was cut before the end" };
  let json: unknown;
  try {
    json = JSON.parse(response.text);
  } catch {
    return { ok: false, problem: "the answer was not valid JSON" };
  }
  const output = ModelOutput.safeParse(json);
  if (!output.success) return { ok: false, problem: "the answer did not match the schema" };
  try {
    return { ok: true, value: normalizeOutput(output.data, settings) };
  } catch (err) {
    if (err instanceof NormalizeError) return { ok: false, problem: err.message };
    throw err;
  }
}

/**
 * Runs one generation and yields every real stage as it happens.
 * Steps: limits and budget, image, model call, validation, normalisation. One retry on unusable output.
 */
export async function* runGeneration(
  input: PipelineInput,
  deps: PipelineDeps,
  summary?: (s: PipelineSummary) => void,
): AsyncGenerator<GenerationEvent> {
  const now = deps.now ?? (() => new Date());
  const clock = deps.clock ?? (() => performance.now());
  const started = clock();
  const usage: ProviderUsage = { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0 };
  let spent = 0;
  let attempts = 0;
  const finish = (status: "ok" | "error", code?: string) =>
    summary?.({ status, code, attempts, durationMs: clock() - started, usage, costUsd: spent });

  let stepStart = 0;
  const begin = (step: GenerationStep): GenerationEvent => {
    stepStart = clock();
    return { type: "step", step, status: "running" };
  };
  const done = (step: GenerationStep): GenerationEvent => ({
    type: "step",
    step,
    status: "done",
    ms: Math.round(clock() - stepStart),
  });
  const fail = (
    code: Extract<GenerationEvent, { type: "error" }>["code"],
    message: string,
    resetAt?: Date,
  ): GenerationEvent => {
    finish("error", code);
    return { type: "error", code, message, ...(resetAt ? { resetAt: resetAt.toISOString() } : {}) };
  };

  // 1. Limits and budget
  yield begin("checks");
  if (!deps.provider || !deps.prices) {
    yield fail("not_configured", "Generation is not configured on this server.");
    return;
  }
  const monthSpend = await deps.limits.monthSpendUsd(now());
  if (monthSpend + worstCaseCostUsd(deps.prices, deps.maxOutputTokens) > deps.budgetUsd) {
    yield fail(
      "budget_exhausted",
      "PixelToCode reached its monthly usage budget. Generation is paused until next month.",
      nextUtcMonth(now()),
    );
    return;
  }
  const quota = await deps.limits.consume(input.visitor, now());
  if (!quota.ok) {
    yield fail(
      "limit_reached",
      quota.window === "day"
        ? "You have used all your generations for today."
        : "Too many generations in a short time. Wait a minute and try again.",
      quota.resetAt,
    );
    return;
  }
  yield done("checks");

  // 2. Image
  yield begin("image");
  let imageDataUrl: string;
  try {
    imageDataUrl = (await prepareImage(input.image)).dataUrl;
  } catch (err) {
    yield fail(
      "invalid_image",
      err instanceof ImageError ? err.message : "The screenshot could not be read.",
    );
    return;
  }
  yield done("image");

  // 3 to 5. Model call, validation and normalisation, with one retry
  const system = systemPrompt(input.settings);
  const user = userPrompt(input.settings);
  let note: string | undefined;
  for (attempts = 1; attempts <= 2; attempts++) {
    yield begin("model");
    let response: ProviderResponse;
    try {
      response = await deps.provider.generate(
        { system, user, imageDataUrl, retryNote: note },
        input.signal,
      );
    } catch (err) {
      yield err instanceof ProviderTimeoutError
        ? fail("model_timeout", "The model took too long to answer.")
        : fail("model_error", "The model could not be reached.");
      return;
    }
    usage.inputTokens += response.usage.inputTokens;
    usage.cachedInputTokens += response.usage.cachedInputTokens;
    usage.outputTokens += response.usage.outputTokens;
    const callCost = costUsd(response.usage, deps.prices);
    spent += callCost;
    await deps.limits.addSpendUsd(callCost, now());
    yield done("model");

    yield begin("validate");
    const parsed = parse(response, input.settings);
    if (!parsed.ok) {
      if (attempts < 2) {
        note = retryNote(parsed.problem);
        continue;
      }
      yield fail("invalid_output", "The generated files could not be used.");
      return;
    }
    yield done("validate");

    yield begin("normalize");
    const result = GenerationResult.safeParse({
      ...parsed.value,
      durationMs: Math.round(clock() - started),
      usage: { ...usage, costUsd: spent },
    });
    if (!result.success) {
      yield fail("invalid_output", "The generated files could not be used.");
      return;
    }
    yield done("normalize");
    finish("ok");
    yield { type: "result", result: result.data };
    return;
  }
}
