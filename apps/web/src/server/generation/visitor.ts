import { createHash } from "node:crypto";

/** The client IP as Vercel reports it. Falls back to a shared bucket when there is none. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}

/** A salted hash of the IP, so the limit store never holds an address. */
export function visitorId(headers: Headers, salt: string): string {
  return createHash("sha256")
    .update(`${salt}:${clientIp(headers)}`)
    .digest("hex")
    .slice(0, 32);
}
