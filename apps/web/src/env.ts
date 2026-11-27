import { z } from "zod";

const flag = z
  .enum(["1", "0", "true", "false"])
  .optional()
  .transform((v) => v === "1" || v === "true");

/**
 * Server environment, validated once. Import it only from server code (route handlers and the
 * generation pipeline). The generation route reports "not_configured" when a value it needs is missing.
 */
const ServerEnv = z.object({
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().min(1).optional(),
  /** Points the client at another endpoint; used by the end-to-end tests. */
  OPENAI_BASE_URL: z.url().optional(),
  /** USD per million tokens for OPENAI_MODEL, from the OpenAI pricing page. */
  OPENAI_PRICE_INPUT_PER_MTOK: z.coerce.number().positive().optional(),
  OPENAI_PRICE_CACHED_INPUT_PER_MTOK: z.coerce.number().nonnegative().optional(),
  OPENAI_PRICE_OUTPUT_PER_MTOK: z.coerce.number().positive().optional(),
  OPENAI_MAX_OUTPUT_TOKENS: z.coerce.number().int().positive().default(16_000),
  OPENAI_TIMEOUT_MS: z.coerce.number().int().positive().default(50_000),

  UPSTASH_REDIS_REST_URL: z.url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  /** Lets a production build run with in-memory limits (local end-to-end tests only). */
  ALLOW_MEMORY_LIMITS: flag,
  IP_HASH_SALT: z.string().min(16).optional(),
  MONTHLY_BUDGET_USD: z.coerce.number().positive().default(18),
  DAILY_GENERATIONS_PER_VISITOR: z.coerce.number().int().positive().default(5),
  GENERATIONS_PER_MINUTE: z.coerce.number().int().positive().default(3),
  /** Extra origins allowed to call the API, comma separated. The app's own origin is always allowed. */
  ALLOWED_ORIGINS: z.string().optional(),
});

const PublicEnv = z.object({
  NEXT_PUBLIC_PREVIEW_ORIGIN: z.url().default("http://localhost:4100"),
});

export type ServerEnv = z.infer<typeof ServerEnv>;
export type PublicEnv = z.infer<typeof PublicEnv>;

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const result = ServerEnv.safeParse(source);
  if (!result.success) {
    const names = result.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Invalid server environment: ${names}`);
  }
  return result.data;
}

export const publicEnv: PublicEnv = PublicEnv.parse({
  NEXT_PUBLIC_PREVIEW_ORIGIN: process.env.NEXT_PUBLIC_PREVIEW_ORIGIN,
});
