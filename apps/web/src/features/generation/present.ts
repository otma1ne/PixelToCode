import { GENERATION_STEPS, STEP_LABELS, type GenerationResult } from "@pixeltocode/schema";
import type { StepItem } from "@/components/ui/steps";
import type { Failure, StepState } from "@/features/workspace/model";

/** All five stages, with the ones the server has not reached yet as pending. */
export function stepItems(steps: StepState[]): StepItem[] {
  return GENERATION_STEPS.map((step) => {
    const state = steps.find((s) => s.step === step);
    return {
      key: step,
      label: STEP_LABELS[step],
      status: state?.status ?? "pending",
      ms: state?.ms,
    };
  });
}

export function lineCount(content: string): number {
  return content === "" ? 0 : content.split("\n").length;
}

/** "Generated InviteMembersCard in 4.3 s with one subcomponent." */
export function resultSentence(result: GenerationResult): string {
  const seconds = (result.durationMs / 1000).toFixed(1);
  const n = result.subcomponents.length;
  const subs = n === 0 ? "" : n === 1 ? " with one subcomponent" : ` with ${n} subcomponents`;
  return `Generated ${result.componentName} in ${seconds} s${subs}.`;
}

/** "00:00" today, or "28 Nov, 00:00" on another day, in the viewer's time zone. */
export function formatReset(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const time = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return date.toDateString() === now.toDateString()
    ? time
    : `${date.toLocaleDateString(undefined, { day: "numeric", month: "short" })}, ${time}`;
}

export function failureTitle(failure: Failure): string {
  switch (failure.code) {
    case "limit_reached":
    case "budget_exhausted":
      return "Usage limit reached";
    case "invalid_image":
      return "Screenshot refused";
    case "network":
      return "Connection lost";
    default:
      return "Generation failed";
  }
}
