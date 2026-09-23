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
  "inline-flex items-center justify-center gap-2 rounded-[10px] font-semibold " +
  "transition-[background-color,border-color,color,box-shadow,transform] duration-150 " +
  "disabled:opacity-55 disabled:pointer-events-none active:translate-y-px " +
  "whitespace-nowrap select-none";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-white shadow-card hover:bg-brand-hover " +
    "hover:shadow-[0_6px_18px_-6px_var(--brand-ring)]",
  secondary:
    "bg-brand-soft text-brand hover:bg-sky-soft border border-transparent " +
    "dark:hover:bg-brand-soft",
  outline:
    "border border-line-strong bg-surface text-ink hover:border-brand hover:text-brand",
  ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
  danger: "bg-danger-soft text-danger hover:bg-danger hover:text-white",
  lime: "bg-lime text-lime-ink hover:brightness-95 dark:text-[#2b3006]",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[0.8rem]",
  md: "h-10 px-4 text-[0.875rem]",
  lg: "h-12 px-6 text-[0.95rem]",
};

/** Shared class string, so `<Link>` can look exactly like a `<Button>`. */
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
