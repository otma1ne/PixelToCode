// Development harness for the preview sandbox. Plays the role of the web app:
// it embeds the sandbox in an opaque-origin iframe and drives it with postMessage.
import { PreviewToHostMessage, type GeneratedFile } from "@pixeltocode/schema";
import {
  BROKEN_TEMPLATE_ANGULAR,
  INVITE_MEMBERS_CARD_ANGULAR,
  INVITE_MEMBERS_CARD_ENTRY,
} from "./examples/invite-members-card.angular";

const frame = document.getElementById("frame") as HTMLIFrameElement;
const status = document.getElementById("status") as HTMLElement;
const log = document.getElementById("log") as HTMLElement;
let counter = 0;
let sentAt = 0;

function setStatus(value: string) {
  status.textContent = value;
  status.dataset.status = value;
}

function render(files: GeneratedFile[], entry: string) {
  counter += 1;
  sentAt = performance.now();
  setStatus("rendering");
  frame.contentWindow?.postMessage(
    { type: "render", id: String(counter), framework: "angular", style: "css", entry, files },
    "*",
  );
}

window.addEventListener("message", (event) => {
  if (event.source !== frame.contentWindow) return;
  const parsed = PreviewToHostMessage.safeParse(event.data);
  if (!parsed.success) return;
  const msg = parsed.data;
  if (msg.type === "size" || msg.type === "pong") return;
  const total = Math.round(performance.now() - sentAt);
  log.textContent += `${JSON.stringify({ ...msg, totalMs: total })}\n`;
  setStatus(msg.type);
});

document
  .getElementById("render")
  ?.addEventListener("click", () => render(INVITE_MEMBERS_CARD_ANGULAR, INVITE_MEMBERS_CARD_ENTRY));
document
  .getElementById("rerender")
  ?.addEventListener("click", () => render(INVITE_MEMBERS_CARD_ANGULAR, INVITE_MEMBERS_CARD_ENTRY));
document
  .getElementById("broken")
  ?.addEventListener("click", () =>
    render(BROKEN_TEMPLATE_ANGULAR, "src/app/broken/broken.component.ts"),
  );
