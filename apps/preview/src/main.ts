import {
  HostToPreviewMessage,
  type PreviewToHostMessage,
  type RenderMessage,
} from "@pixeltocode/schema";
import { CompileError, type RenderResult } from "./runtimes/types";

/**
 * Origins allowed to drive this sandbox, comma separated, set at build time.
 * When empty (local development), any parent may send messages.
 */
const allowedHosts = (import.meta.env.VITE_HOST_ORIGINS ?? "")
  .split(",")
  .map((s: string) => s.trim())
  .filter(Boolean);

const root = document.getElementById("root") as HTMLElement;
let hostOrigin: string | null = null;

function send(message: PreviewToHostMessage) {
  if (window.parent === window) return;
  window.parent.postMessage(message, hostOrigin ?? "*");
}

async function render(msg: RenderMessage): Promise<RenderResult> {
  switch (msg.framework) {
    case "angular": {
      const { renderAngular } = await import("./runtimes/angular");
      return renderAngular(root, msg.entry, msg.files);
    }
    default:
      throw new CompileError(`The ${msg.framework} preview is not available yet`);
  }
}

window.addEventListener("message", async (event: MessageEvent) => {
  if (event.source !== window.parent) return;
  if (allowedHosts.length > 0 && !allowedHosts.includes(event.origin)) return;
  const parsed = HostToPreviewMessage.safeParse(event.data);
  if (!parsed.success) return;
  hostOrigin = allowedHosts.length > 0 ? event.origin : "*";
  const msg = parsed.data;

  if (msg.type === "ping") {
    send({ type: "pong", id: msg.id });
    return;
  }

  try {
    const { timings } = await render(msg);
    send({ type: "rendered", id: msg.id, timings });
  } catch (err) {
    if (err instanceof CompileError) {
      send({ type: "compileError", id: msg.id, file: err.file, message: err.message });
    } else {
      send({
        type: "runtimeError",
        id: msg.id,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
});

window.addEventListener("error", (event) => {
  send({ type: "runtimeError", id: "", message: event.message });
});
window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason as unknown;
  send({
    type: "runtimeError",
    id: "",
    message: reason instanceof Error ? reason.message : String(reason),
  });
});

new ResizeObserver(() => {
  send({
    type: "size",
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
  });
}).observe(document.documentElement);
