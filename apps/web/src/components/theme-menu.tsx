"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { applyThemeMode, readThemeMode, subscribeThemeMode, type ThemeMode } from "@/lib/theme";

const MODES: { value: ThemeMode; label: string; icon: typeof Moon }[] = [
  { value: "dark", label: "Dark", icon: Moon },
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
];

export function ThemeMenu() {
  const mode = useSyncExternalStore(subscribeThemeMode, readThemeMode, () => "dark" as const);
  const Current = MODES.find((m) => m.value === mode)?.icon ?? Moon;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="ghost" size="icon" className="size-control" aria-label="Theme">
          <Current aria-hidden strokeWidth={1.5} />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-36 rounded-[10px] bg-panel p-1.5 shadow-menu"
        >
          <DropdownMenu.Label className="px-2 py-1 text-caption text-muted">
            Theme
          </DropdownMenu.Label>
          <DropdownMenu.RadioGroup
            value={mode}
            onValueChange={(v) => applyThemeMode(v as ThemeMode)}
          >
            {MODES.map(({ value, label, icon: Icon }) => (
              <DropdownMenu.RadioItem
                key={value}
                value={value}
                className="flex h-control items-center gap-2 rounded-sm px-2 text-body-sm text-ink-2 outline-none data-[highlighted]:bg-hover data-[highlighted]:text-ink"
              >
                <Icon aria-hidden strokeWidth={1.5} className="size-4 text-muted" />
                {label}
                <DropdownMenu.ItemIndicator className="ml-auto">
                  <Check aria-hidden strokeWidth={1.5} className="size-4" />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
