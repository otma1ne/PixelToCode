"use client";

import {
  Code,
  Image as ImageIcon,
  Maximize2,
  Monitor,
  RefreshCw,
  Smartphone,
  Tablet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { ExampleChip } from "@/features/screenshot/example-chip";
import { useWorkspace } from "./store";

const VIEWS = [
  { value: "preview", label: "Preview", disabled: true },
  { value: "code", label: "Code", disabled: true },
  { value: "compare", label: "Compare", disabled: true },
] as const;

const VIEWPORTS = [
  { label: "Desktop · 1280 px", icon: Monitor },
  { label: "Tablet · 768 px", icon: Tablet },
  { label: "Mobile · 375 px", icon: Smartphone },
];

/** The result side before any generation: toolbar in its disabled state and an empty canvas. */
export function ResultPanel() {
  const screenshot = useWorkspace((s) => s.screenshot);
  return (
    <div className="grid h-full grid-rows-[52px_minmax(0,1fr)]">
      <div className="flex min-w-0 items-center gap-2 border-b border-line px-2.5">
        <SegmentedControl label="Result view" value="preview" options={VIEWS} onChange={() => {}} />
        <div className="mx-auto flex h-control max-w-[420px] min-w-0 flex-1 items-center gap-2 rounded-md bg-raised px-2.5 text-body-sm text-muted max-[1024px]:hidden">
          <Monitor aria-hidden strokeWidth={1.5} className="size-4" />
          <span className="truncate font-medium text-ink-2">No component yet</span>
        </div>
        <span className="hidden flex-1 max-[1024px]:block" />
        <div className="flex items-center gap-1">
          <div
            role="group"
            aria-label="Viewport"
            className="inline-flex gap-0.5 rounded-md bg-raised p-[3px]"
          >
            {VIEWPORTS.map(({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                disabled
                aria-label={label}
                className="grid h-[26px] w-8 place-items-center rounded-sm text-muted disabled:opacity-40"
              >
                <Icon aria-hidden strokeWidth={1.5} className="size-4" />
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-control"
            disabled
            aria-label="Refresh preview"
          >
            <RefreshCw aria-hidden strokeWidth={1.5} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-control"
            disabled
            aria-label="Fullscreen preview"
          >
            <Maximize2 aria-hidden strokeWidth={1.5} />
          </Button>
        </div>
      </div>

      <div className="relative grid min-h-0 place-items-center bg-canvas p-6 text-center">
        <div className="grid max-w-[340px] justify-items-center gap-2">
          <span className="mb-1.5 grid size-12 place-items-center rounded-lg border border-line bg-panel text-muted">
            {screenshot ? (
              <Code aria-hidden strokeWidth={1.5} className="size-5" />
            ) : (
              <ImageIcon aria-hidden strokeWidth={1.5} className="size-5" />
            )}
          </span>
          <h2 className="text-title-3">
            {screenshot ? "Ready to generate" : "Your component will appear here"}
          </h2>
          <p className="text-body text-muted">
            {screenshot
              ? "Check the framework and styling on the left, then generate."
              : "Upload a screenshot on the left, or start from an example."}
          </p>
          {screenshot ? null : <ExampleChip className="mt-2" />}
        </div>
      </div>
    </div>
  );
}
