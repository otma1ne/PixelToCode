import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** Small status or count label. Radius full is reserved for badges and chips. */
export function Badge({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-full bg-raised px-2 text-caption text-muted",
        className,
      )}
      {...props}
    />
  );
}
