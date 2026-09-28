import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Four variants, not six. There used to be a `lime` button, which meant a
 * screen could offer a blue primary action and a yellow-green one with no rule
 * for which was which. One accent, one primary action per view.
 */
export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-box border font-medium " +
  "whitespace-nowrap transition-[background-color,border-color,color] duration-120 " +
  // A press should feel like a press. One pixel is enough to read as physical
  // without becoming an animation.
  "active:translate-y-px disabled:opacity-50 disabled:pointer-events-none " +
  "disabled:active:translate-y-0";

const variants: Record<ButtonVariant, string> = {
  primary: "border-brand-fill bg-brand-fill text-white hover:bg-brand-hover hover:border-brand-hover",
  secondary: "border-line bg-surface-2 text-ink-2 hover:bg-surface-3 hover:text-ink",
  outline: "border-line-strong bg-surface text-ink hover:bg-surface-2",
  ghost: "border-transparent bg-transparent text-ink-2 hover:bg-surface-2 hover:text-ink",
  danger: "border-line-strong bg-surface text-danger hover:bg-danger-soft hover:border-danger",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-7 px-2.5 text-[0.8rem]",
  md: "h-9 px-3.5 text-[0.875rem]",
  lg: "h-10 px-4 text-[0.9rem]",
};

/** Shared class string, so a link can look like a button. */
export function btn(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  extra?: string,
): string {
  return cn(base, variants[variant], sizes[size], extra);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return <button className={btn(variant, size, className)} {...props} />;
}
