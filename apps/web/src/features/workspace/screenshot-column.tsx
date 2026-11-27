"use client";

import { FRAMEWORK_LABELS, STYLE_LABELS } from "@pixeltocode/schema";
import { Upload, WifiOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Conversation } from "@/features/generation/conversation";
import { DropZone } from "@/features/screenshot/drop-zone";
import { useModKeyLabel } from "@/features/screenshot/hooks";
import { ScreenshotCard } from "@/features/screenshot/screenshot-card";
import { SettingsForm } from "@/features/settings/settings-form";
import { useOnline } from "@/lib/use-online";
import { canGenerate } from "./model";
import { useWorkspace } from "./store";

export function ScreenshotColumn({ onFile }: { onFile: (file: File) => void }) {
  const workspace = useWorkspace();
  const { screenshot, imageError, removeScreenshot, settings, phase, result, generate } = workspace;
  const online = useOnline();
  const mod = useModKeyLabel();
  const [editing, setEditing] = useState(false);
  const ready = canGenerate(workspace) && online;
  const label = FRAMEWORK_LABELS[settings.framework];
  // Once a component exists the settings fold into one line, as in the approved layout.
  const showSettings = !result || editing;

  return (
    <div className="flex-1 overflow-auto p-4">
      {!online ? (
        <p className="-mx-4 -mt-4 mb-4 flex items-center gap-2 border-b border-line bg-raised px-4 py-2 text-body-sm text-ink-2">
          <WifiOff aria-hidden strokeWidth={1.5} className="size-4 text-warn" />
          Offline. Generation needs a connection.
        </p>
      ) : null}

      {screenshot ? (
        <ScreenshotCard screenshot={screenshot} onReplace={onFile} onRemove={removeScreenshot} />
      ) : (
        <DropZone
          onFile={onFile}
          className="grid justify-items-center gap-1.5 rounded-lg px-4 py-7 text-center"
        >
          <Upload aria-hidden strokeWidth={1.5} className="size-5 text-muted" />
          <span className="font-medium">Drop a screenshot</span>
          <span className="text-body-sm text-muted">Paste with {mod}+V or click to browse</span>
          <span className="text-caption text-muted">PNG, JPEG or WebP, up to 5 MB</span>
        </DropZone>
      )}
      {imageError ? (
        <p role="alert" className="mt-2 text-body-sm text-danger">
          {imageError}
        </p>
      ) : null}

      <div className="mt-4 grid gap-3.5">
        {showSettings ? (
          <SettingsForm />
        ) : (
          <div className="flex items-center gap-2 text-body-sm">
            <span className="text-muted">Settings</span>
            <span className="font-medium">
              {label} · {STYLE_LABELS[settings.style]}
            </span>
            <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setEditing(true)}>
              Change
            </Button>
          </div>
        )}
        <Button
          variant={result ? "outline" : "primary"}
          className="w-full"
          disabled={!ready}
          onClick={() => {
            setEditing(false);
            void generate();
          }}
        >
          {phase === "generating"
            ? `Generating ${label} component`
            : result
              ? `Generate again with ${label}`
              : `Generate ${label} component`}
          {phase === "generating" ? null : (
            <kbd className="rounded-xs bg-raised px-1 font-sans text-[11px] text-muted">
              {mod}+↵
            </kbd>
          )}
        </Button>
      </div>

      <Conversation canRetry={ready} />
    </div>
  );
}
