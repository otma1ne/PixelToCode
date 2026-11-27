"use client";

import { formatBytes, MAX_INSTRUCTIONS_LENGTH } from "@pixeltocode/schema";
import { ArrowRight, Plus, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DropZone } from "@/features/screenshot/drop-zone";
import {
  useModEnter,
  useModKeyLabel,
  usePasteScreenshot,
  useScreenshotFile,
} from "@/features/screenshot/hooks";
import { CompactPickers } from "@/features/settings/compact-pickers";
import { canGenerate } from "@/features/workspace/model";
import { hydrateWorkspace, useWorkspace } from "@/features/workspace/store";

/** The landing hero: drop a screenshot, pick a framework, continue in the app. */
export function UploadBox() {
  const router = useRouter();
  const workspace = useWorkspace();
  const onFile = useScreenshotFile();
  const mod = useModKeyLabel();
  const [showInstructions, setShowInstructions] = useState(false);
  const ready = canGenerate(workspace);
  const { screenshot } = workspace;

  useEffect(() => hydrateWorkspace(), []);
  usePasteScreenshot(onFile);
  const go = () => router.push("/app");
  useModEnter(go, ready);

  return (
    <div className="mx-auto mt-10 max-w-[720px] rounded-lg border border-line-strong bg-panel p-3 text-left shadow-raise">
      {screenshot ? (
        <div className="flex items-center gap-4 rounded-md border border-line p-3 max-[720px]:gap-3">
          <img
            src={screenshot.src}
            alt="Selected screenshot"
            className="h-[100px] w-[132px] shrink-0 rounded-sm object-cover object-top ring-1 ring-line max-[720px]:h-[72px] max-[720px]:w-24"
          />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-medium">{screenshot.name}</p>
            <p className="text-body-sm text-muted">
              {screenshot.width} × {screenshot.height}
              {screenshot.example ? " · Example" : ` · ${formatBytes(screenshot.bytes)}`}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto size-control self-start"
            aria-label="Remove screenshot"
            onClick={workspace.removeScreenshot}
          >
            <X aria-hidden strokeWidth={1.5} />
          </Button>
        </div>
      ) : (
        <DropZone
          onFile={onFile}
          className="flex min-h-[132px] items-center gap-4 rounded-md p-5 max-[720px]:flex-col max-[720px]:text-center"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-[10px] bg-raised text-muted">
            <Upload aria-hidden strokeWidth={1.5} className="size-5" />
          </span>
          <span>
            <span className="block text-[15px] font-medium">Drop a screenshot here</span>
            <span className="text-body-sm text-muted">
              or paste with {mod}+V, or click to browse. PNG, JPEG or WebP, up to 5 MB.
            </span>
          </span>
        </DropZone>
      )}

      {showInstructions ? (
        <div className="mt-2.5">
          <Textarea
            aria-label="Instructions (optional)"
            maxLength={MAX_INSTRUCTIONS_LENGTH}
            placeholder="Optional instructions, e.g. use standalone components and keep the original spacing"
            value={workspace.settings.instructions}
            onChange={(e) => workspace.setInstructions(e.target.value)}
            className="min-h-16"
          />
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <CompactPickers />
        <Button aria-expanded={showInstructions} onClick={() => setShowInstructions((v) => !v)}>
          <Plus aria-hidden strokeWidth={1.5} />
          Instructions
        </Button>
        <span className="flex-1" />
        <span className="text-caption text-muted max-[720px]:hidden">{mod}+↵</span>
        <Button variant="primary" disabled={!ready} onClick={go}>
          Generate
          <ArrowRight aria-hidden strokeWidth={1.5} />
        </Button>
      </div>

      {workspace.imageError ? (
        <p role="alert" className="mt-2 text-body-sm text-danger">
          {workspace.imageError}
        </p>
      ) : null}
    </div>
  );
}
