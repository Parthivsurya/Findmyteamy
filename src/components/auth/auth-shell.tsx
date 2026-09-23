import type { ReactNode } from "react";

/** A plain, centred single-column frame for the sign-in screens. */
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
    <div className="mx-auto w-full max-w-md px-4 py-10 sm:px-6">
      <h1 className="text-xl font-semibold">{title}</h1>
      {subtitle ? (
        <p className="mt-1.5 text-[0.88rem] leading-relaxed text-ink-muted">
          {subtitle}
        </p>
      ) : null}

      <div className="mt-5">{children}</div>

      {footer ? <div className="mt-6">{footer}</div> : null}
    </div>
  );
}
