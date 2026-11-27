import { GenerationEvent, type GenerationSettings } from "@pixeltocode/schema";
import { createSseParser } from "@/lib/sse";
import type { Screenshot } from "@/features/workspace/model";

async function screenshotBlob(screenshot: Screenshot): Promise<Blob> {
  // Works for uploaded data URLs and for the built-in example served by the site.
  const response = await fetch(screenshot.src);
  return response.blob();
}

/**
 * Sends the screenshot and settings to POST /api/generate and reports each server event.
 * Resolves when the stream ends. Throws only for network failures.
 */
export async function streamGeneration(
  screenshot: Screenshot,
  settings: GenerationSettings,
  onEvent: (event: GenerationEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const form = new FormData();
  form.set("image", await screenshotBlob(screenshot), screenshot.name);
  form.set("settings", JSON.stringify(settings));

  const response = await fetch("/api/generate", { method: "POST", body: form, signal });
  if (!response.ok || !response.body) {
    onEvent({
      type: "error",
      code: response.status === 403 ? "origin_not_allowed" : "model_error",
      message: "The server refused the request.",
    });
    return;
  }

  let finished = false;
  const parse = createSseParser((data) => {
    const event = GenerationEvent.safeParse(data);
    if (!event.success) return;
    if (event.data.type !== "step") finished = true;
    onEvent(event.data);
  });
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    parse(value);
  }
  if (!finished) {
    onEvent({
      type: "error",
      code: "model_error",
      message: "The connection closed before the end.",
    });
  }
}
