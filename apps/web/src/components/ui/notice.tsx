import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const TONES = {
  info: { icon: Info, color: "text-muted" },
  ok: { icon: CircleCheck, color: "text-ok" },
  warn: { icon: TriangleAlert, color: "text-warn" },
  danger: { icon: CircleAlert, color: "text-danger" },
} as const;

export interface NoticeProps {
  tone?: keyof typeof TONES;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** A state message: what happened in one sentence, what to do in another. Status always has an icon. */
export function Notice({ tone = "info", title, children, action, className }: NoticeProps) {
  const { icon: Icon, color } = TONES[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-lg border border-line bg-panel p-3", className)}
    >
      <Icon aria-hidden className={cn("mt-0.5 size-4 shrink-0", color)} strokeWidth={1.5} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-label text-ink">{title}</p>
        {children ? <div className="text-body-sm text-ink-2">{children}</div> : null}
        {action ? <div className="mt-2 flex gap-2">{action}</div> : null}
      </div>
    </div>
  );
}
