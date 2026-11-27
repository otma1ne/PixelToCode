"use client";

import { GenerationSettings, type Framework, type StyleSystem } from "@pixeltocode/schema";
import { create } from "zustand";
import {
  frameworkChanged,
  INITIAL_WORKSPACE,
  instructionsChanged,
  screenshotAccepted,
  screenshotRejected,
  screenshotRemoved,
  styleChanged,
  type Screenshot,
  type WorkspaceData,
} from "./model";

interface WorkspaceActions {
  acceptScreenshot: (screenshot: Screenshot) => void;
  rejectScreenshot: (error: string) => void;
  removeScreenshot: () => void;
  setFramework: (framework: Framework) => void;
  setStyle: (style: StyleSystem) => void;
  setInstructions: (instructions: string) => void;
}

export type WorkspaceStore = WorkspaceData & WorkspaceActions;

const STORAGE_KEY = "ptc-workspace";
/** sessionStorage holds about 5 MB; larger screenshots are kept in memory only. */
const MAX_PERSISTED_SRC = 3_000_000;

function load(): Partial<WorkspaceData> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw) as Partial<WorkspaceData>;
    const settings = GenerationSettings.safeParse(data.settings);
    const screenshot = data.screenshot ?? null;
    return {
      ...(settings.success ? { settings: settings.data } : {}),
      ...(screenshot ? { screenshot, phase: "uploaded" as const } : {}),
    };
  } catch {
    return {};
  }
}

function save(state: WorkspaceData) {
  try {
    const screenshot =
      state.screenshot && state.screenshot.src.length <= MAX_PERSISTED_SRC
        ? state.screenshot
        : null;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ settings: state.settings, screenshot }));
  } catch {
    // Storage full or unavailable: the work stays in memory for this page.
  }
}

/** The workspace survives a reload in the same tab, and is never sent anywhere. */
export const useWorkspace = create<WorkspaceStore>()((set) => {
  const update = (fn: (s: WorkspaceData) => WorkspaceData) =>
    set((s) => {
      const next = fn(s);
      save(next);
      return next;
    });
  return {
    ...INITIAL_WORKSPACE,
    acceptScreenshot: (screenshot) => update((s) => screenshotAccepted(s, screenshot)),
    rejectScreenshot: (error) => update((s) => screenshotRejected(s, error)),
    removeScreenshot: () => update(screenshotRemoved),
    setFramework: (framework) => update((s) => frameworkChanged(s, framework)),
    setStyle: (style) => update((s) => styleChanged(s, style)),
    setInstructions: (instructions) => update((s) => instructionsChanged(s, instructions)),
  };
});

let hydrated = false;
/** Restores the saved workspace once, after the first client render, to keep hydration stable. */
export function hydrateWorkspace() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  useWorkspace.setState(load());
}
