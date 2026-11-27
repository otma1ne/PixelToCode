import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** Native select, styled like the other controls. Native keeps keyboard and mobile behaviour. */
export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <span className={cn("relative inline-flex", className)}>
      <select
        className="h-control w-full appearance-none rounded-md border border-line-strong bg-panel pr-7 pl-2.5 text-body-sm text-ink transition-colors duration-[120ms] hover:bg-hover"
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        strokeWidth={1.5}
        className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-muted"
      />
    </span>
  );
}
