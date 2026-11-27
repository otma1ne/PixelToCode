import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type ConsumeResult = { ok: true } | { ok: false; window: "day" | "minute"; resetAt: Date };

/** Usage limits and the monthly spend counter. Redis in production, memory for local work and tests. */
export interface LimitStore {
  consume(visitor: string, now: Date): Promise<ConsumeResult>;
  monthSpendUsd(now: Date): Promise<number>;
  addSpendUsd(usd: number, now: Date): Promise<void>;
}

export interface LimitConfig {
  perDay: number;
  perMinute: number;
}

const monthKey = (now: Date) =>
  `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
/** Spend is stored in micro-dollars so Redis can add integers. */
const MICRO = 1_000_000;

export function nextUtcMidnight(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}

export function nextUtcMonth(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

export function createMemoryLimitStore(config: LimitConfig): LimitStore {
  const counts = new Map<string, number>();
  const spend = new Map<string, number>();
  const bump = (key: string) => {
    const n = (counts.get(key) ?? 0) + 1;
    counts.set(key, n);
    return n;
  };
  return {
    async consume(visitor, now) {
      const day = `${visitor}:${now.toISOString().slice(0, 10)}`;
      const minuteStart = Math.floor(now.getTime() / 60_000);
      const minute = `${visitor}:m${minuteStart}`;
      if ((counts.get(minute) ?? 0) >= config.perMinute) {
        return { ok: false, window: "minute", resetAt: new Date((minuteStart + 1) * 60_000) };
      }
      if ((counts.get(day) ?? 0) >= config.perDay) {
        return { ok: false, window: "day", resetAt: nextUtcMidnight(now) };
      }
      bump(minute);
      bump(day);
      return { ok: true };
    },
    async monthSpendUsd(now) {
      return (spend.get(monthKey(now)) ?? 0) / MICRO;
    },
    async addSpendUsd(usd, now) {
      const key = monthKey(now);
      spend.set(key, (spend.get(key) ?? 0) + Math.round(usd * MICRO));
    },
  };
}

export function createRedisLimitStore(redis: Redis, config: LimitConfig): LimitStore {
  // Fixed daily windows start at 00:00 UTC, which is what the interface announces.
  const daily = new Ratelimit({
    redis,
    prefix: "ptc:day",
    limiter: Ratelimit.fixedWindow(config.perDay, "1 d"),
  });
  const burst = new Ratelimit({
    redis,
    prefix: "ptc:min",
    limiter: Ratelimit.slidingWindow(config.perMinute, "1 m"),
  });
  return {
    async consume(visitor) {
      const minute = await burst.limit(visitor);
      if (!minute.success) return { ok: false, window: "minute", resetAt: new Date(minute.reset) };
      const day = await daily.limit(visitor);
      if (!day.success) return { ok: false, window: "day", resetAt: new Date(day.reset) };
      return { ok: true };
    },
    async monthSpendUsd(now) {
      const value = await redis.get<number>(`ptc:spend:${monthKey(now)}`);
      return (value ?? 0) / MICRO;
    },
    async addSpendUsd(usd, now) {
      const key = `ptc:spend:${monthKey(now)}`;
      await redis.incrby(key, Math.round(usd * MICRO));
      await redis.expire(key, 60 * 60 * 24 * 40);
    },
  };
}
