"use client";

import { FRAMEWORK_LABELS } from "@pixeltocode/schema";
import { Download } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/brand/logo";
import { ThemeMenu } from "@/components/theme-menu";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { cn } from "@/lib/cn";
import { useModEnter, usePasteScreenshot, useScreenshotFile } from "@/features/screenshot/hooks";
import { canGenerate, projectName } from "./model";
import { ScreenshotColumn } from "./screenshot-column";
import { ResultPanel } from "./result-panel";
import { hydrateWorkspace, useWorkspace } from "./store";

type MobileView = "chat" | "result";

/** The app: screenshot and settings on the left, the result on the right. */
export function Workspace() {
  const workspace = useWorkspace();
  const onFile = useScreenshotFile();
  const [mobileView, setMobileView] = useState<MobileView>("chat");
  // The notice belongs to the screenshot and settings it was requested for; any change hides it.
  const requestKey = JSON.stringify([
    workspace.screenshot?.src.length,
    workspace.screenshot?.name,
    workspace.settings,
  ]);
  const [requestedFor, setRequestedFor] = useState<string | null>(null);
  const generateRequested = requestedFor === requestKey;

  useEffect(() => hydrateWorkspace(), []);
  usePasteScreenshot(onFile);
  const ready = canGenerate(workspace);
  const requestGenerate = () => setRequestedFor(requestKey);
  useModEnter(requestGenerate, ready);

  return (
    <div className="grid h-dvh grid-rows-[52px_minmax(0,1fr)] bg-bg max-[720px]:grid-rows-[52px_44px_minmax(0,1fr)]">
      <header className="flex items-center gap-2.5 border-b border-line pr-2.5 pl-4">
        <Link href="/" aria-label="PixelToCode home" className="text-ink">
          <LogoMark />
        </Link>
        <span aria-hidden className="text-[18px] font-light text-faint max-[720px]:hidden">
          /
        </span>
        <h1 className="flex min-w-0 items-center gap-2 text-label max-[720px]:hidden">
          <span className="truncate">{projectName(workspace)}</span>
        </h1>
        <div className="ml-auto flex items-center gap-1.5">
          <ThemeMenu />
          {/* Outline until there is a result: lime stays on the one primary action of the view. */}
          <Button disabled title="Export is available after a generation">
            <Download aria-hidden strokeWidth={1.5} />
            <span className="max-[720px]:hidden">Export</span>
          </Button>
        </div>
      </header>

      <div className="hidden items-center border-b border-line px-3 max-[720px]:flex">
        <SegmentedControl<MobileView>
          label="View"
          fill
          className="w-full"
          value={mobileView}
          options={[
            { value: "chat", label: "Chat" },
            { value: "result", label: "Result" },
          ]}
          onChange={setMobileView}
        />
      </div>

      <main className="grid min-h-0 grid-cols-[380px_minmax(0,1fr)] max-[1024px]:grid-cols-[320px_minmax(0,1fr)] max-[720px]:grid-cols-1">
        <aside
          aria-label="Screenshot and settings"
          className={cn(
            "flex min-h-0 flex-col border-r border-line max-[720px]:border-r-0",
            mobileView === "result" && "max-[720px]:hidden",
          )}
        >
          <ScreenshotColumn
            onFile={onFile}
            ready={ready}
            generateRequested={generateRequested}
            onGenerate={requestGenerate}
            frameworkLabel={FRAMEWORK_LABELS[workspace.settings.framework]}
          />
        </aside>
        <section
          aria-label="Result"
          className={cn("min-h-0 min-w-0", mobileView === "chat" && "max-[720px]:hidden")}
        >
          <ResultPanel />
        </section>
      </main>
    </div>
  );
}
