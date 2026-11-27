import {
  formatBytes,
  IMAGE_SIGNATURE_BYTES,
  MAX_IMAGE_BYTES,
  sniffImageType,
  type AcceptedImageType,
} from "@pixeltocode/schema";
import type { Screenshot } from "@/features/workspace/model";

export type ReadResult = { ok: true; screenshot: Screenshot } | { ok: false; error: string };

/** Checks size and content type from the first bytes. Pure, so it is unit tested. */
export function checkScreenshotFile(file: {
  name: string;
  size: number;
  head: Uint8Array;
}): { ok: true; type: AcceptedImageType } | { ok: false; error: string } {
  const name = file.name || "The pasted image";
  if (file.size === 0) return { ok: false, error: `${name} is empty.` };
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: `${name} is ${formatBytes(file.size)}. The limit is 5 MB.` };
  }
  const type = sniffImageType(file.head);
  if (!type) return { ok: false, error: `${name} is not a PNG, JPEG or WebP image.` };
  return { ok: true, type };
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

function decode(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("decode failed"));
    img.src = src;
  });
}

const PASTED_NAMES: Record<AcceptedImageType, string> = {
  "image/png": "pasted-image.png",
  "image/jpeg": "pasted-image.jpg",
  "image/webp": "pasted-image.webp",
};

/** Validates a dropped, pasted or picked file and reads it into a screenshot. */
export async function readScreenshot(file: File): Promise<ReadResult> {
  const head = new Uint8Array(await file.slice(0, IMAGE_SIGNATURE_BYTES).arrayBuffer());
  const check = checkScreenshotFile({ name: file.name, size: file.size, head });
  if (!check.ok) return check;
  try {
    const src = await readAsDataUrl(file.slice(0, file.size, check.type));
    const { width, height } = await decode(src);
    return {
      ok: true,
      screenshot: {
        src,
        name: file.name || PASTED_NAMES[check.type],
        type: check.type,
        bytes: file.size,
        width,
        height,
        example: false,
      },
    };
  } catch {
    return {
      ok: false,
      error: `${file.name || "The pasted image"} could not be read as an image.`,
    };
  }
}

export const EXAMPLE_SCREENSHOT: Screenshot = {
  src: "/examples/invite-members.png",
  name: "invite-members.png",
  type: "image/png",
  bytes: 90_720,
  width: 1280,
  height: 1232,
  example: true,
};
