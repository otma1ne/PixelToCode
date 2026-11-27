"use client";

import { ACCEPTED_IMAGE_TYPES, formatBytes } from "@pixeltocode/schema";
import { RefreshCw, Trash2 } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import type { Screenshot } from "@/features/workspace/model";

/** The current screenshot in the app column, with replace and remove. */
export function ScreenshotCard({
  screenshot,
  onReplace,
  onRemove,
}: {
  screenshot: Screenshot;
  onReplace: (file: File) => void;
  onRemove: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <figure className="m-0 overflow-hidden rounded-lg border border-line bg-panel">
      <img
        src={screenshot.src}
        alt={`Screenshot: ${screenshot.name}`}
        className="block max-h-[180px] w-full bg-[#f3f4f6] object-cover object-top"
      />
      <figcaption className="flex items-center gap-2 border-t border-line py-2 pr-2 pl-3 text-body-sm">
        <span className="truncate font-medium">{screenshot.name}</span>
        <span className="text-caption whitespace-nowrap text-muted">
          {screenshot.width} × {screenshot.height}
          {screenshot.example ? "" : ` · ${formatBytes(screenshot.bytes)}`}
        </span>
        <span className="ml-auto flex">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Replace screenshot"
            title="Replace"
            onClick={() => input.current?.click()}
          >
            <RefreshCw aria-hidden strokeWidth={1.5} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Remove screenshot"
            title="Remove"
            onClick={onRemove}
          >
            <Trash2 aria-hidden strokeWidth={1.5} />
          </Button>
        </span>
        <input
          ref={input}
          type="file"
          hidden
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          data-testid="screenshot-replace-input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onReplace(file);
            e.target.value = "";
          }}
        />
      </figcaption>
    </figure>
  );
}
