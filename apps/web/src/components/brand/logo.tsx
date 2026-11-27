import { cn } from "@/lib/cn";

/** The mark: three pixels fading into a caret. The caret takes the mark-caret token. */
export function LogoMark({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <rect x="1" y="1" width="4" height="4" fill="currentColor" />
      <rect x="1" y="6" width="4" height="4" fill="currentColor" opacity=".55" />
      <rect x="1" y="11" width="4" height="4" fill="currentColor" opacity=".25" />
      <rect x="8" y="1" width="2.5" height="14" fill="var(--mark-caret)" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-[15px] font-semibold tracking-[-0.02em]",
        className,
      )}
    >
      <LogoMark />
      <span>pixeltocode</span>
    </span>
  );
}
