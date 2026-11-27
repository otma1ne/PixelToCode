import { describe, expect, it } from "vitest";
import { parseServerEnv } from "./env";

describe("parseServerEnv", () => {
  it("applies the default limits", () => {
    const env = parseServerEnv({});
    expect(env.MONTHLY_BUDGET_USD).toBe(18);
    expect(env.DAILY_GENERATIONS_PER_VISITOR).toBe(5);
  });

  it("rejects an invalid Redis URL without echoing its value", () => {
    expect(() => parseServerEnv({ UPSTASH_REDIS_REST_URL: "secret-not-a-url" })).toThrow(
      "Invalid server environment: UPSTASH_REDIS_REST_URL",
    );
  });
});
