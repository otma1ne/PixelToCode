import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Input({ className, type = "text", ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "h-control w-full min-w-0 rounded-md border border-line-strong bg-panel px-3 text-body text-ink transition-colors duration-[120ms] placeholder:text-muted disabled:opacity-50 aria-invalid:border-danger",
        className,
      )}
      {...props}
    />
  );
}
