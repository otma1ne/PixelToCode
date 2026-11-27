import { formatBytes, MAX_IMAGE_BYTES, sniffImageType } from "@pixeltocode/schema";
import sharp from "sharp";

export const MAX_SIDE = 2048;

export class ImageError extends Error {}

export interface PreparedImage {
  dataUrl: string;
  width: number;
  height: number;
  bytes: number;
}

/**
 * Checks the bytes, then re-encodes the screenshot at most 2048 px on its longest side.
 * Re-encoding drops all metadata and caps the number of image tokens.
 */
export async function prepareImage(input: Uint8Array): Promise<PreparedImage> {
  if (input.byteLength === 0) throw new ImageError("The screenshot is empty.");
  if (input.byteLength > MAX_IMAGE_BYTES) {
    throw new ImageError(`The screenshot is ${formatBytes(input.byteLength)}. The limit is 5 MB.`);
  }
  const type = sniffImageType(input);
  if (!type) throw new ImageError("The screenshot is not a PNG, JPEG or WebP image.");

  try {
    const pipeline = sharp(input, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true });
    const encoded =
      type === "image/png"
        ? pipeline.png({ compressionLevel: 9 })
        : pipeline.jpeg({ quality: 90, mozjpeg: true });
    const { data, info } = await encoded.toBuffer({ resolveWithObject: true });
    const mime = type === "image/png" ? "image/png" : "image/jpeg";
    return {
      dataUrl: `data:${mime};base64,${data.toString("base64")}`,
      width: info.width,
      height: info.height,
      bytes: data.byteLength,
    };
  } catch {
    throw new ImageError("The screenshot could not be read as an image.");
  }
}
