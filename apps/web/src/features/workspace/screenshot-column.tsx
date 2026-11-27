"use client";

import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { DropZone } from "@/features/screenshot/drop-zone";
import { useModKeyLabel } from "@/features/screenshot/hooks";
import { ScreenshotCard } from "@/features/screenshot/screenshot-card";
import { SettingsForm } from "@/features/settings/settings-form";
import { useWorkspace } from "./store";

export function ScreenshotColumn({
  onFile,
  ready,
  generateRequested,
  onGenerate,
  frameworkLabel,
}: {
  onFile: (file: File) => void;
  ready: boolean;
  generateRequested: boolean;
  onGenerate: () => void;
  frameworkLabel: string;
}) {
  const screenshot = useWorkspace((s) => s.screenshot);
  const imageError = useWorkspace((s) => s.imageError);
  const removeScreenshot = useWorkspace((s) => s.removeScreenshot);
  const mod = useModKeyLabel();

  return (
    <div className="flex-1 overflow-auto p-4">
      {screenshot ? (
        <ScreenshotCard screenshot={screenshot} onReplace={onFile} onRemove={removeScreenshot} />
      ) : (
        <DropZone
          onFile={onFile}
          className="grid justify-items-center gap-1.5 rounded-lg px-4 py-7 text-center"
        >
          <Upload aria-hidden strokeWidth={1.5} className="size-5 text-muted" />
          <span className="font-medium">Drop a screenshot</span>
          <span className="grid gap-1.5">
            <span className="text-body-sm text-muted">Paste with {mod}+V or click to browse</span>
            <span className="text-caption text-muted">PNG, JPEG or WebP, up to 5 MB</span>
          </span>
        </DropZone>
      )}
      {imageError ? (
        <p role="alert" className="mt-2 text-body-sm text-danger">
          {imageError}
        </p>
      ) : null}

      <div className="mt-4 grid gap-3.5">
        <SettingsForm />
        <Button variant="primary" className="w-full" disabled={!ready} onClick={onGenerate}>
          Generate {frameworkLabel} component
          <kbd className="rounded-xs bg-on-accent/10 px-1 font-sans text-[11px]">{mod}+↵</kbd>
        </Button>
        {generateRequested ? (
          <Notice title="Generation is not connected yet">
            Your screenshot and settings are ready. Generation arrives in the next update of
            PixelToCode.
          </Notice>
        ) : null}
      </div>
    </div>
  );
}
