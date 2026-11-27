"use client";

import { cn } from "@/lib/cn";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
  /** Shown as a tooltip on disabled options. */
  hint?: string;
}

export interface SegmentedControlProps<T extends string> {
  label: string;
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
  className?: string;
  /** Stretch the options to fill the width, as in the settings column. */
  fill?: boolean;
}

/** A group of toggle buttons; the pressed one is the current value. */
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
  fill = false,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("inline-flex gap-0.5 rounded-md bg-raised p-[3px]", fill && "flex", className)}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          disabled={o.disabled}
          title={o.disabled ? o.hint : undefined}
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex h-[26px] items-center justify-center rounded-sm px-2.5 text-body-sm text-muted transition-colors duration-[120ms] hover:text-ink aria-pressed:bg-panel aria-pressed:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-muted",
            fill && "flex-1",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
