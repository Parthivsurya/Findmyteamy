import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "lime";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-1.5 rounded border font-medium " +
  "transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";

const variants: Record<ButtonVariant, string> = {
  primary: "border-brand bg-brand text-white hover:bg-brand-hover",
  secondary: "border-line bg-surface-2 text-ink-2 hover:bg-surface-3",
  outline: "border-line-strong bg-surface text-ink hover:bg-surface-2",
  ghost: "border-transparent bg-transparent text-ink-2 hover:bg-surface-2",
  danger: "border-danger bg-surface text-danger hover:bg-danger-soft",
  lime: "border-line-strong bg-lime text-lime-ink hover:brightness-97",
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
