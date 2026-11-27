"use client";

import { cn } from "@/lib/cn";
import { useWorkspace } from "@/features/workspace/store";
import { EXAMPLE_SCREENSHOT } from "./read-screenshot";

/** Loads the built-in Invite members card screenshot. */
export function ExampleChip({ className, onPick }: { className?: string; onPick?: () => void }) {
  const accept = useWorkspace((s) => s.acceptScreenshot);
  return (
    <button
      type="button"
      onClick={() => {
        accept(EXAMPLE_SCREENSHOT);
        onPick?.();
      }}
      className={cn(
        "inline-flex h-control items-center gap-2 rounded-full border border-line-strong bg-panel pr-3 pl-1 text-body-sm text-ink transition-colors duration-[120ms] hover:bg-hover",
        className,
      )}
    >
      <img
        src={EXAMPLE_SCREENSHOT.src}
        alt=""
        className="h-6 w-9 rounded-full object-cover object-top"
      />
      Invite members card
    </button>
  );
}
