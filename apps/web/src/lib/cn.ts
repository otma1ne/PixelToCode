import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/** Text styles from the design system, so tailwind-merge does not confuse text-body with text-ink. */
export const TEXT_STYLES = [
  "display",
  "title-1",
  "title-2",
  "title-3",
  "body-lg",
  "body",
  "label",
  "body-sm",
  "caption",
  "code",
  "mono-sm",
] as const;

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [...TEXT_STYLES],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
