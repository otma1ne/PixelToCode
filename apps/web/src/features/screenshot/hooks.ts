"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { useWorkspace } from "@/features/workspace/store";
import { readScreenshot } from "./read-screenshot";

/** Reads a file into the workspace, or records why it was rejected. */
export function useScreenshotFile() {
  const accept = useWorkspace((s) => s.acceptScreenshot);
  const reject = useWorkspace((s) => s.rejectScreenshot);
  return useCallback(
    async (file: File) => {
      const result = await readScreenshot(file);
      if (result.ok) accept(result.screenshot);
      else reject(result.error);
    },
    [accept, reject],
  );
}

/** Takes an image pasted anywhere on the page. Text pastes are left alone. */
export function usePasteScreenshot(onFile: (file: File) => void) {
  const handler = useRef(onFile);
  useEffect(() => {
    handler.current = onFile;
  });
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const item = Array.from(event.clipboardData?.items ?? []).find((i) => i.kind === "file");
      const file = item?.getAsFile();
      if (!file) return;
      event.preventDefault();
      handler.current(file);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, []);
}

/** Cmd+Enter on macOS, Ctrl+Enter elsewhere. */
export function useModEnter(onTrigger: () => void, enabled: boolean) {
  const handler = useRef(onTrigger);
  useEffect(() => {
    handler.current = onTrigger;
  });
  useEffect(() => {
    if (!enabled) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        handler.current();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [enabled]);
}

const noSubscription = () => () => {};

/** "⌘" on Apple platforms, "Ctrl" elsewhere. The server renders "Ctrl". */
export function useModKeyLabel(): string {
  return useSyncExternalStore(
    noSubscription,
    () => (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? "⌘" : "Ctrl"),
    () => "Ctrl",
  );
}
