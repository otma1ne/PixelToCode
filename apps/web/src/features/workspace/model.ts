import {
  DEFAULT_SETTINGS,
  isSupportedCombination,
  MAX_INSTRUCTIONS_LENGTH,
  supportedStyles,
  type AcceptedImageType,
  type Framework,
  type GenerationErrorCode,
  type GenerationEvent,
  type GenerationResult,
  type GenerationSettings,
  type GenerationStep,
  type StyleSystem,
} from "@pixeltocode/schema";

export interface Screenshot {
  /** Data URL of an uploaded file, or a site path for a built-in example. */
  src: string;
  name: string;
  type: AcceptedImageType;
  bytes: number;
  width: number;
  height: number;
  example: boolean;
}

export type WorkspacePhase =
  | "empty"
  | "uploaded"
  | "generating"
  | "ready"
  | "failed"
  | "limitReached";

export interface StepState {
  step: GenerationStep;
  status: "running" | "done";
  ms?: number;
}

export interface Failure {
  code: GenerationErrorCode | "network";
  message: string;
  resetAt?: string;
}

export interface WorkspaceData {
  phase: WorkspacePhase;
  screenshot: Screenshot | null;
  settings: GenerationSettings;
  /** Why the last file was rejected, shown under the drop zone. */
  imageError: string | null;
  /** Settings of the generation in progress or last finished, shown in the conversation. */
  request: GenerationSettings | null;
  steps: StepState[];
  result: GenerationResult | null;
  failure: Failure | null;
}

export const INITIAL_WORKSPACE: WorkspaceData = {
  phase: "empty",
  screenshot: null,
  settings: DEFAULT_SETTINGS,
  imageError: null,
  request: null,
  steps: [],
  result: null,
  failure: null,
};

const CLEARED_GENERATION: Pick<WorkspaceData, "request" | "steps" | "result" | "failure"> = {
  request: null,
  steps: [],
  result: null,
  failure: null,
};

// Transitions are pure so they can be tested without React.

/** A new screenshot starts over: the previous result belonged to the previous image. */
export function screenshotAccepted(state: WorkspaceData, screenshot: Screenshot): WorkspaceData {
  if (state.phase === "generating") return state;
  return { ...state, ...CLEARED_GENERATION, screenshot, imageError: null, phase: "uploaded" };
}

export function screenshotRejected(state: WorkspaceData, error: string): WorkspaceData {
  return { ...state, imageError: error };
}

export function screenshotRemoved(state: WorkspaceData): WorkspaceData {
  return { ...state, ...CLEARED_GENERATION, screenshot: null, imageError: null, phase: "empty" };
}

/** Changing the framework keeps the style when it still works, otherwise falls back to the first supported one. */
export function frameworkChanged(state: WorkspaceData, framework: Framework): WorkspaceData {
  const { style } = state.settings;
  const nextStyle = isSupportedCombination(framework, style)
    ? style
    : (supportedStyles(framework)[0] as StyleSystem);
  return { ...state, settings: { ...state.settings, framework, style: nextStyle } };
}

/** Unsupported styles are ignored: the interface never offers them. */
export function styleChanged(state: WorkspaceData, style: StyleSystem): WorkspaceData {
  if (!isSupportedCombination(state.settings.framework, style)) return state;
  return { ...state, settings: { ...state.settings, style } };
}

export function instructionsChanged(state: WorkspaceData, instructions: string): WorkspaceData {
  return {
    ...state,
    settings: { ...state.settings, instructions: instructions.slice(0, MAX_INSTRUCTIONS_LENGTH) },
  };
}

export function canGenerate(state: WorkspaceData): boolean {
  return state.screenshot !== null && state.phase !== "generating";
}

export function generationStarted(state: WorkspaceData): WorkspaceData {
  if (!canGenerate(state)) return state;
  return { ...state, phase: "generating", request: state.settings, steps: [], failure: null };
}

/** Applies one server event. Steps update in place so each one keeps its measured time. */
export function generationEvent(state: WorkspaceData, event: GenerationEvent): WorkspaceData {
  if (state.phase !== "generating") return state;
  if (event.type === "step") {
    const others = state.steps.filter((s) => s.step !== event.step);
    const index = state.steps.findIndex((s) => s.step === event.step);
    const next: StepState = { step: event.step, status: event.status, ms: event.ms };
    const steps =
      index === -1 ? [...others, next] : state.steps.map((s, i) => (i === index ? next : s));
    return { ...state, steps };
  }
  if (event.type === "result") {
    return { ...state, phase: "ready", result: event.result, failure: null };
  }
  return generationFailed(state, {
    code: event.code,
    message: event.message,
    resetAt: event.resetAt,
  });
}

export function generationFailed(state: WorkspaceData, failure: Failure): WorkspaceData {
  const limited = failure.code === "limit_reached" || failure.code === "budget_exhausted";
  // A failed retry keeps the previous result visible.
  return { ...state, phase: limited ? "limitReached" : "failed", failure };
}

/** "invite-members.png" → "invite-members", used as the project name in the top bar. */
export function projectName(state: WorkspaceData): string {
  if (state.result) return state.result.componentName;
  return state.screenshot ? state.screenshot.name.replace(/\.[^.]+$/, "") : "New component";
}
