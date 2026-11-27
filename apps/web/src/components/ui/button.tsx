import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/**
 * Buttons follow the design system: one primary action per view (lime in Dark, Graphite in Light),
 * outline and ghost for everything else. Heights are fixed by the size tokens.
 */
export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md whitespace-nowrap text-label transition-colors duration-[120ms] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-accent text-on-accent hover:opacity-90",
        outline: "border border-line-strong bg-transparent text-ink hover:bg-hover",
        ghost: "bg-transparent text-ink-2 hover:bg-hover hover:text-ink aria-pressed:bg-hover",
        danger: "border border-line-strong bg-transparent text-danger hover:bg-hover",
      },
      size: {
        sm: "h-control-sm px-2 text-body-sm",
        md: "h-control px-3",
        lg: "h-control-lg px-4",
        icon: "size-control-sm",
      },
    },
    defaultVariants: {
      variant: "outline",
      size: "md",
    },
  },
);

export type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Renders the child element (a link, for example) with the button styles. */
    asChild?: boolean;
  };

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
