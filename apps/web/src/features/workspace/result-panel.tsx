"use client";

import { FRAMEWORK_LABELS } from "@pixeltocode/schema";
import {
  CircleAlert,
  Code,
  FileText,
  Image as ImageIcon,
  Maximize2,
  Monitor,
  RefreshCw,
  Smartphone,
  Tablet,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Steps } from "@/components/ui/steps";
import { lineCount, stepItems } from "@/features/generation/present";
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

function Centered({
  icon,
  title,
  children,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="grid w-full max-w-[380px] justify-items-center gap-2">
      {icon ? (
        <span className="mb-1.5 grid size-12 place-items-center rounded-lg border border-line bg-panel text-muted">
          {icon}
        </span>
      ) : null}
      <h2 className="text-title-3">{title}</h2>
      {children}
    </div>
  );
}

/** The result side: toolbar, then the state of the current generation. */
export function ResultPanel() {
  const { screenshot, phase, steps, result, request } = useWorkspace();
  const framework = request ? FRAMEWORK_LABELS[request.framework] : "";

  let body: ReactNode;
  if (phase === "generating") {
    body = (
      <Centered title={`Generating ${framework} component`}>
        <p className="text-body text-muted">Each step appears as the server finishes it.</p>
        <Steps items={stepItems(steps)} className="mt-2 w-[280px] text-left" />
      </Centered>
    );
  } else if (result) {
    body = (
      <Centered
        icon={<Code aria-hidden strokeWidth={1.5} className="size-5" />}
        title={result.componentName}
      >
        <p className="text-body text-muted">{result.summary}</p>
        <ul className="mt-2 grid w-full gap-0.5 rounded-[10px] border border-line bg-panel p-1 text-left">
          {result.files.map((f) => (
            <li
              key={f.path}
              className="flex h-[30px] items-center gap-2 px-2 text-body-sm text-ink-2"
            >
              <FileText aria-hidden strokeWidth={1.5} className="size-4 shrink-0 text-faint" />
              <span className="truncate font-mono text-mono-sm">{f.path}</span>
              <span className="ml-auto shrink-0 text-caption text-muted">
                {lineCount(f.content)}
              </span>
            </li>
          ))}
        </ul>
        {result.assumptions.length > 0 ? (
          <div className="mt-2 w-full text-left">
            <p className="text-body-sm font-medium">Assumptions</p>
            <ul className="mt-1 list-disc pl-5 text-body-sm text-muted">
              {result.assumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="mt-2 text-caption text-muted">
          The code editor and the live preview come in the next updates of PixelToCode.
        </p>
      </Centered>
    );
  } else if (phase === "failed" || phase === "limitReached") {
    body = (
      <Centered
        icon={<CircleAlert aria-hidden strokeWidth={1.5} className="size-5" />}
        title="Nothing to show"
      >
        <p className="text-body text-muted">
          The last generation did not finish. Details are on the left.
        </p>
      </Centered>
    );
  } else {
    body = (
      <Centered
        icon={
          screenshot ? (
            <Code aria-hidden strokeWidth={1.5} className="size-5" />
          ) : (
            <ImageIcon aria-hidden strokeWidth={1.5} className="size-5" />
          )
        }
        title={screenshot ? "Ready to generate" : "Your component will appear here"}
      >
        <p className="text-body text-muted">
          {screenshot
            ? "Check the framework and styling on the left, then generate."
            : "Upload a screenshot on the left, or start from an example."}
        </p>
        {screenshot ? null : <ExampleChip className="mt-2" />}
      </Centered>
    );
  }

  return (
    <div className="grid h-full grid-rows-[52px_minmax(0,1fr)]">
      <div className="flex min-w-0 items-center gap-2 border-b border-line px-2.5">
        <SegmentedControl label="Result view" value="preview" options={VIEWS} onChange={() => {}} />
        <div className="mx-auto flex h-control max-w-[420px] min-w-0 flex-1 items-center gap-2 rounded-md bg-raised px-2.5 text-body-sm text-muted max-[1024px]:hidden">
          <Monitor aria-hidden strokeWidth={1.5} className="size-4" />
          <span className="truncate font-medium text-ink-2">
            {result ? `${result.componentName} · ${framework}` : "No component yet"}
          </span>
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

      <div className="relative grid min-h-0 place-items-center overflow-auto bg-canvas p-6 text-center">
        {body}
      </div>
    </div>
  );
}
