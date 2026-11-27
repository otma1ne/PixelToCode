import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export interface StepItem {
  key: string;
  label: string;
  status: "pending" | "running" | "done";
  ms?: number;
}

const formatMs = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`);

/** Real pipeline stages with their measured times. No percentages. */
export function Steps({ items, className }: { items: StepItem[]; className?: string }) {
  return (
    <ol className={cn("grid gap-1.5", className)} aria-label="Generation steps">
      {items.map((item) => (
        <li
          key={item.key}
          className={cn(
            "flex items-center gap-2.5 text-body-sm",
            item.status === "pending" ? "text-muted" : "text-ink-2",
          )}
        >
          <span aria-hidden className="grid size-4 shrink-0 place-items-center">
            {item.status === "done" ? (
              <Check strokeWidth={2} className="size-3.5 text-ok" />
            ) : item.status === "running" ? (
              <span className="size-2 animate-pulse rounded-full bg-accent-ink" />
            ) : (
              <span className="size-1.5 rounded-full bg-faint" />
            )}
          </span>
          <span className="flex-1">
            {item.label}
            <span className="sr-only">
              {item.status === "done" ? ", done" : item.status === "running" ? ", in progress" : ""}
            </span>
          </span>
          {item.ms !== undefined ? (
            <span className="font-mono text-caption text-muted">{formatMs(item.ms)}</span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
