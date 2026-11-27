import type { ProviderUsage } from "./provider";

/** USD per million tokens. */
export interface Prices {
  input: number;
  cachedInput: number;
  output: number;
}

/** Cost of one call from the tokens OpenAI reports as billed. */
export function costUsd(usage: ProviderUsage, prices: Prices): number {
  const uncached = Math.max(0, usage.inputTokens - usage.cachedInputTokens);
  return (
    (uncached * prices.input +
      usage.cachedInputTokens * prices.cachedInput +
      usage.outputTokens * prices.output) /
    1_000_000
  );
}

/** Generous upper bound of the input tokens of one call: prompt plus a 2048 px screenshot. */
export const MAX_INPUT_TOKENS_ESTIMATE = 8_000;

/** Worst case cost of one generation including its single retry, used before calling the model. */
export function worstCaseCostUsd(prices: Prices, maxOutputTokens: number): number {
  const oneCall =
    (MAX_INPUT_TOKENS_ESTIMATE * prices.input + maxOutputTokens * prices.output) / 1_000_000;
  return 2 * oneCall;
}
