import { Redis } from "@upstash/redis";
import { parseServerEnv, type ServerEnv } from "@/env";
import type { Prices } from "./cost";
import { createMemoryLimitStore, createRedisLimitStore, type LimitStore } from "./limits";
import type { PipelineDeps } from "./pipeline";
import { createOpenAIProvider } from "./provider";

export interface ServerConfig {
  env: ServerEnv;
  deps: PipelineDeps;
  /** Why generation cannot run, for the log. Null when everything is set. */
  missing: string | null;
}

let cached: ServerConfig | null = null;

function pricesFrom(env: ServerEnv): Prices | null {
  if (!env.OPENAI_PRICE_INPUT_PER_MTOK || !env.OPENAI_PRICE_OUTPUT_PER_MTOK) return null;
  return {
    input: env.OPENAI_PRICE_INPUT_PER_MTOK,
    cachedInput: env.OPENAI_PRICE_CACHED_INPUT_PER_MTOK ?? env.OPENAI_PRICE_INPUT_PER_MTOK,
    output: env.OPENAI_PRICE_OUTPUT_PER_MTOK,
  };
}

function limitsFrom(env: ServerEnv): LimitStore | null {
  const config = {
    perDay: env.DAILY_GENERATIONS_PER_VISITOR,
    perMinute: env.GENERATIONS_PER_MINUTE,
  };
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    return createRedisLimitStore(
      new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN }),
      config,
    );
  }
  // Serverless instances do not share memory, so production requires Redis.
  if (process.env.NODE_ENV !== "production" || env.ALLOW_MEMORY_LIMITS) {
    return createMemoryLimitStore(config);
  }
  return null;
}

/** Reads the environment once per server instance. */
export function serverConfig(): ServerConfig {
  if (cached) return cached;
  const env = parseServerEnv(process.env);
  const prices = pricesFrom(env);
  const limits = limitsFrom(env);
  const missing = [
    !env.OPENAI_API_KEY && "OPENAI_API_KEY",
    !env.OPENAI_MODEL && "OPENAI_MODEL",
    !prices && "OPENAI_PRICE_INPUT_PER_MTOK / OPENAI_PRICE_OUTPUT_PER_MTOK",
    !limits && "UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN",
    process.env.NODE_ENV === "production" && !env.IP_HASH_SALT && "IP_HASH_SALT",
  ].filter(Boolean);

  const ready = missing.length === 0;
  cached = {
    env,
    missing: ready ? null : missing.join(", "),
    deps: {
      provider:
        ready && env.OPENAI_API_KEY && env.OPENAI_MODEL
          ? createOpenAIProvider({
              apiKey: env.OPENAI_API_KEY,
              model: env.OPENAI_MODEL,
              baseURL: env.OPENAI_BASE_URL,
              timeoutMs: env.OPENAI_TIMEOUT_MS,
              maxOutputTokens: env.OPENAI_MAX_OUTPUT_TOKENS,
            })
          : null,
      prices,
      limits: limits ?? createMemoryLimitStore({ perDay: 0, perMinute: 0 }),
      budgetUsd: env.MONTHLY_BUDGET_USD,
      maxOutputTokens: env.OPENAI_MAX_OUTPUT_TOKENS,
    },
  };
  return cached;
}

/** For tests only. */
export function resetServerConfig() {
  cached = null;
}
