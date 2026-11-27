import { z } from "zod";

/**
 * Server environment, validated once. Import it only from server code (route handlers and the generation pipeline).
 * Variables marked optional are not used yet; they become required in the phase that needs them.
 */
const ServerEnv = z.object({
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().min(1).optional(),
  UPSTASH_REDIS_REST_URL: z.url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  IP_HASH_SALT: z.string().min(16).optional(),
  MONTHLY_BUDGET_USD: z.coerce.number().positive().default(18),
  DAILY_GENERATIONS_PER_VISITOR: z.coerce.number().int().positive().default(5),
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
