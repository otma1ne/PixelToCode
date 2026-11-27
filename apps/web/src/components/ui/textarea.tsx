import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-[72px] w-full resize-y rounded-md border border-line-strong bg-transparent px-2.5 py-2 text-body text-ink transition-colors duration-[120ms] placeholder:text-muted",
        className,
      )}
      {...props}
    />
  );
}
