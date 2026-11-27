import {
  DEFAULT_SETTINGS,
  isSupportedCombination,
  MAX_INSTRUCTIONS_LENGTH,
  supportedStyles,
  type AcceptedImageType,
  type Framework,
  type GenerationSettings,
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

/** Phases reachable in this version. Generation phases are added with the generation pipeline. */
export type WorkspacePhase = "empty" | "uploaded";

export interface WorkspaceData {
  phase: WorkspacePhase;
  screenshot: Screenshot | null;
  settings: GenerationSettings;
  /** Why the last file was rejected, shown under the drop zone. */
  imageError: string | null;
}

export const INITIAL_WORKSPACE: WorkspaceData = {
  phase: "empty",
  screenshot: null,
  settings: DEFAULT_SETTINGS,
  imageError: null,
};

// Transitions are pure so they can be tested without React.

export function screenshotAccepted(state: WorkspaceData, screenshot: Screenshot): WorkspaceData {
  return { ...state, screenshot, imageError: null, phase: "uploaded" };
}

export function screenshotRejected(state: WorkspaceData, error: string): WorkspaceData {
  return { ...state, imageError: error };
}

export function screenshotRemoved(state: WorkspaceData): WorkspaceData {
  return { ...state, screenshot: null, imageError: null, phase: "empty" };
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
  return state.screenshot !== null && state.phase === "uploaded";
}

/** "invite-members.png" → "invite-members", used as the project name in the top bar. */
export function projectName(state: WorkspaceData): string {
  return state.screenshot ? state.screenshot.name.replace(/\.[^.]+$/, "") : "New component";
}
