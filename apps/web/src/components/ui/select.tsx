"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

export interface SelectProps<T extends string> {
  /** Accessible name; the trigger shows only the current value. */
  label: string;
  value: T;
  options: readonly SelectOption<T>[];
  onValueChange: (value: T) => void;
  className?: string;
}

/**
 * A listbox styled with the design system tokens. Radix keeps the native behaviour:
 * keyboard navigation, type-ahead, focus return and screen reader roles.
 */
export function Select<T extends string>({
  label,
  value,
  options,
  onValueChange,
  className,
}: SelectProps<T>) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={(v) => onValueChange(v as T)}>
      <SelectPrimitive.Trigger
        aria-label={label}
        className={cn(
          "inline-flex h-control min-w-0 items-center justify-between gap-2 rounded-md border border-line-strong bg-panel pr-2 pl-2.5 text-body-sm text-ink transition-colors duration-[120ms] hover:bg-hover data-[state=open]:bg-hover",
          className,
        )}
      >
        <SelectPrimitive.Value />
        <SelectPrimitive.Icon asChild>
          <ChevronDown aria-hidden strokeWidth={1.5} className="size-3.5 shrink-0 text-muted" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className="z-50 max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width) overflow-hidden rounded-[10px] bg-panel p-1.5 shadow-menu"
        >
          <SelectPrimitive.Viewport className="grid gap-0.5">
            {options.map((o) => (
              <SelectPrimitive.Item
                key={o.value}
                value={o.value}
                className="flex h-control items-center gap-2 rounded-sm pr-2 pl-2.5 text-body-sm text-ink-2 outline-none data-[highlighted]:bg-hover data-[highlighted]:text-ink data-[state=checked]:text-ink"
              >
                <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="ml-auto">
                  <Check aria-hidden strokeWidth={1.5} className="size-4 text-accent-ink" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
