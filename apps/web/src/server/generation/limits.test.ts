import { describe, expect, it } from "vitest";
import { costUsd, worstCaseCostUsd } from "./cost";
import { createMemoryLimitStore, nextUtcMidnight, nextUtcMonth } from "./limits";
import { clientIp, visitorId } from "./visitor";

const prices = { input: 2, cachedInput: 0.5, output: 8 };

describe("cost", () => {
  it("prices billed tokens, with cached input at its own rate", () => {
    expect(
      costUsd({ inputTokens: 3000, cachedInputTokens: 1000, outputTokens: 5000 }, prices),
    ).toBeCloseTo((2000 * 2 + 1000 * 0.5 + 5000 * 8) / 1e6);
  });

  it("estimates the worst case of a generation and its retry", () => {
    expect(worstCaseCostUsd(prices, 16_000)).toBeCloseTo((2 * (8000 * 2 + 16_000 * 8)) / 1e6);
  });
});

describe("memory limit store", () => {
  const now = new Date("2026-11-27T15:00:00Z");

  it("allows the daily quota then reports the reset at midnight UTC", async () => {
    const store = createMemoryLimitStore({ perDay: 2, perMinute: 10 });
    expect(await store.consume("a", now)).toEqual({ ok: true });
    expect(await store.consume("a", now)).toEqual({ ok: true });
    expect(await store.consume("a", now)).toEqual({
      ok: false,
      window: "day",
      resetAt: new Date("2026-11-28T00:00:00Z"),
    });
    expect(await store.consume("b", now)).toEqual({ ok: true });
  });

  it("limits bursts per minute", async () => {
    const store = createMemoryLimitStore({ perDay: 10, perMinute: 1 });
    await store.consume("a", now);
    const second = await store.consume("a", now);
    expect(second).toMatchObject({ ok: false, window: "minute" });
  });

  it("adds spend per month", async () => {
    const store = createMemoryLimitStore({ perDay: 1, perMinute: 1 });
    await store.addSpendUsd(0.0123, now);
    await store.addSpendUsd(0.0077, now);
    expect(await store.monthSpendUsd(now)).toBeCloseTo(0.02);
    expect(await store.monthSpendUsd(new Date("2026-12-01T00:00:00Z"))).toBe(0);
  });

  it("computes reset times in UTC", () => {
    expect(nextUtcMidnight(now).toISOString()).toBe("2026-11-28T00:00:00.000Z");
    expect(nextUtcMonth(now).toISOString()).toBe("2026-12-01T00:00:00.000Z");
  });
});

describe("visitor", () => {
  it("uses the first forwarded address and never returns it in clear", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" });
    expect(clientIp(headers)).toBe("203.0.113.7");
    const id = visitorId(headers, "a-long-enough-salt");
    expect(id).toHaveLength(32);
    expect(id).not.toContain("203");
    expect(visitorId(headers, "another-salt-value")).not.toBe(id);
  });
});
