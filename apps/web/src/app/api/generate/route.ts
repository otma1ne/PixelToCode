import { GenerationSettings, MAX_IMAGE_BYTES, type GenerationEvent } from "@pixeltocode/schema";
import { encodeSseEvent } from "@/lib/sse";
import { serverConfig } from "@/server/generation/deps";
import { runGeneration, type PipelineSummary } from "@/server/generation/pipeline";
import { visitorId } from "@/server/generation/visitor";

/** Runs on Node.js (the default), needed by sharp. Two model calls of at most 50 s each, plus image work. */
export const maxDuration = 120;

const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-store, no-transform",
  "X-Content-Type-Options": "nosniff",
};

function stream(events: AsyncIterable<GenerationEvent> | GenerationEvent[]): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      for await (const event of events) controller.enqueue(encoder.encode(encodeSseEvent(event)));
      controller.close();
    },
  });
  return new Response(body, { headers: SSE_HEADERS });
}

const error = (code: Extract<GenerationEvent, { type: "error" }>["code"], message: string) =>
  stream([{ type: "error", code, message }]);

function originAllowed(request: Request, extra: string | undefined): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const allowed = new Set([new URL(request.url).origin]);
  for (const o of extra?.split(",") ?? []) if (o.trim()) allowed.add(o.trim());
  return allowed.has(origin);
}

function log(summary: PipelineSummary, settings: GenerationSettings) {
  // Structured and minimal: no image, no code, no instructions, no address.
  console.info(
    JSON.stringify({
      event: "generation",
      framework: settings.framework,
      style: settings.style,
      ...summary,
      durationMs: Math.round(summary.durationMs),
      costUsd: Number(summary.costUsd.toFixed(6)),
    }),
  );
}

export async function POST(request: Request): Promise<Response> {
  const config = serverConfig();
  if (!originAllowed(request, config.env.ALLOWED_ORIGINS)) {
    return Response.json({ code: "origin_not_allowed" }, { status: 403 });
  }

  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > MAX_IMAGE_BYTES + 64 * 1024) {
    return error("invalid_image", "The screenshot is over 5 MB.");
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return error("invalid_request", "The request could not be read.");
  }
  const image = form.get("image");
  const settingsRaw = form.get("settings");
  if (!(image instanceof Blob) || typeof settingsRaw !== "string") {
    return error("invalid_request", "A screenshot and settings are required.");
  }
  let settingsJson: unknown;
  try {
    settingsJson = JSON.parse(settingsRaw);
  } catch {
    return error("invalid_request", "The settings could not be read.");
  }
  const settings = GenerationSettings.safeParse(settingsJson);
  if (!settings.success) return error("invalid_request", "These settings are not supported.");
  if (image.size > MAX_IMAGE_BYTES) return error("invalid_image", "The screenshot is over 5 MB.");

  if (config.missing) {
    console.warn(JSON.stringify({ event: "generation_not_configured", missing: config.missing }));
  }

  const visitor = visitorId(request.headers, config.env.IP_HASH_SALT ?? "local-development-salt");
  const bytes = new Uint8Array(await image.arrayBuffer());
  return stream(
    runGeneration(
      { image: bytes, settings: settings.data, visitor, signal: request.signal },
      config.deps,
      (summary) => log(summary, settings.data),
    ),
  );
}
