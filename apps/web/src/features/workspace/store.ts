"use client";

import {
  GenerationResult,
  GenerationSettings,
  type Framework,
  type StyleSystem,
} from "@pixeltocode/schema";
import { create } from "zustand";
import { streamGeneration } from "@/features/generation/client";
import {
  canGenerate,
  frameworkChanged,
  generationEvent,
  generationFailed,
  generationStarted,
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
  generate: () => Promise<void>;
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
    const request = GenerationSettings.safeParse(data.request);
    const result = GenerationResult.safeParse(data.result);
    const screenshot = data.screenshot ?? null;
    return {
      ...(settings.success ? { settings: settings.data } : {}),
      ...(screenshot ? { screenshot, phase: "uploaded" as const } : {}),
      ...(screenshot && result.success && request.success
        ? { result: result.data, request: request.data, phase: "ready" as const }
        : {}),
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
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        settings: state.settings,
        screenshot,
        request: state.request,
        result: screenshot ? state.result : null,
      }),
    );
  } catch {
    // Storage full or unavailable: the work stays in memory for this page.
  }
}

let controller: AbortController | null = null;

/** The workspace survives a reload in the same tab. It is only sent to the server to generate. */
export const useWorkspace = create<WorkspaceStore>()((set, get) => {
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
    removeScreenshot: () => {
      controller?.abort();
      update(screenshotRemoved);
    },
    setFramework: (framework) => update((s) => frameworkChanged(s, framework)),
    setStyle: (style) => update((s) => styleChanged(s, style)),
    setInstructions: (instructions) => update((s) => instructionsChanged(s, instructions)),
    generate: async () => {
      const state = get();
      if (!canGenerate(state) || !state.screenshot) return;
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        update((s) =>
          generationFailed(generationStarted(s), {
            code: "network",
            message: "You are offline. Generation needs a connection.",
          }),
        );
        return;
      }
      controller = new AbortController();
      const { signal } = controller;
      update(generationStarted);
      try {
        await streamGeneration(
          state.screenshot,
          state.settings,
          (event) => update((s) => generationEvent(s, event)),
          signal,
        );
      } catch {
        if (signal.aborted) return;
        update((s) =>
          generationFailed(s, {
            code: "network",
            message: "The connection was lost during the generation.",
          }),
        );
      }
    },
  };
});

let hydrated = false;
/** Restores the saved workspace once, after the first client render, to keep hydration stable. */
export function hydrateWorkspace() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  useWorkspace.setState(load());
}
