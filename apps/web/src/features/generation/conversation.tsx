"use client";

import { FRAMEWORK_LABELS, STYLE_LABELS } from "@pixeltocode/schema";
import { FileText } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Steps } from "@/components/ui/steps";
import { useWorkspace } from "@/features/workspace/store";
import { failureTitle, formatReset, lineCount, resultSentence, stepItems } from "./present";

/** The request and its outcome, as a short conversation under the screenshot. */
export function Conversation({ canRetry }: { canRetry: boolean }) {
  const { request, phase, steps, result, failure, generate } = useWorkspace();
  if (!request) return null;

  const requestText = `Generate ${FRAMEWORK_LABELS[request.framework]} · ${STYLE_LABELS[request.style]}${
    request.instructions.trim() ? ` — ${request.instructions.trim()}` : ""
  }`;

  return (
    <div className="mt-5 grid gap-5" aria-live="polite">
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-[12px_12px_4px_12px] bg-raised px-3 py-2 text-body break-words">
          {requestText}
        </p>
      </div>

      <div>
        <p className="mb-2 flex items-center gap-2 text-body-sm font-medium">
          <LogoMark size={14} />
          PixelToCode
        </p>

        {phase === "generating" ? <Steps items={stepItems(steps)} /> : null}

        {result && phase !== "generating" ? (
          <div className="grid gap-2.5">
            <p className="text-body text-ink-2">{resultSentence(result)}</p>
            <ul
              className="grid gap-0.5 rounded-[10px] border border-line bg-panel p-1"
              aria-label="Generated files"
            >
              {result.files.map((f) => (
                <li
                  key={f.path}
                  className="flex h-[30px] items-center gap-2 px-2 text-body-sm text-ink-2"
                >
                  <FileText aria-hidden strokeWidth={1.5} className="size-4 shrink-0 text-faint" />
                  <span className="truncate">{f.path.split("/").pop()}</span>
                  <span className="ml-auto shrink-0 text-caption text-muted">
                    {lineCount(f.content)} lines
                  </span>
                </li>
              ))}
            </ul>
            {result.removedDependencies.length > 0 ? (
              <p className="text-body-sm text-muted">
                Removed packages the preview cannot load: {result.removedDependencies.join(", ")}.
              </p>
            ) : null}
          </div>
        ) : null}

        {failure && phase !== "generating" ? (
          <Notice
            className={result ? "mt-3" : undefined}
            tone={phase === "limitReached" ? "warn" : "danger"}
            title={failureTitle(failure)}
            action={
              phase === "failed" && canRetry ? (
                <Button size="sm" onClick={() => void generate()}>
                  Retry
                </Button>
              ) : undefined
            }
          >
            {failure.message}
            {failure.resetAt ? ` You can generate again at ${formatReset(failure.resetAt)}.` : ""}
            {phase === "limitReached" ? " Your screenshot and settings are kept." : ""}
          </Notice>
        ) : null}
      </div>
    </div>
  );
}
