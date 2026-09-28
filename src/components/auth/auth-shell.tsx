import type { ReactNode } from "react";

/**
 * The frame for the sign-in screens. Same left-aligned column and the same
 * vertical rhythm as the home page, so arriving here does not feel like a
 * different site: one heading, one line of explanation, the form, then a rule
 * separating whatever comes after it.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-md px-4 pb-20 pt-14 sm:px-6 sm:pt-16">
      <h1 className="text-[1.5rem] leading-[1.15]">{title}</h1>
      {subtitle ? (
        <p className="mt-2 text-[0.9rem] leading-relaxed text-ink-muted">
          {subtitle}
        </p>
      ) : null}

      <div className="mt-7">{children}</div>

      {footer ? <div className="rule mt-8 pt-5">{footer}</div> : null}
    </div>
  );
}
