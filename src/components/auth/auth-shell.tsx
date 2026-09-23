import type { ReactNode } from "react";
import { CheckIcon, ShieldIcon, SparklesIcon } from "@/components/icons";

/**
 * The two-column frame shared by sign-in, sign-up, code entry and reset, so
 * the whole flow feels like one thing.
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
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:py-16">
      <section className="hidden lg:block">
        <div className="hero-grid relative h-full overflow-hidden rounded-2xl brand-gradient p-8">
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgb(255_255_255/0.16)] px-3 py-1 text-[0.75rem] font-semibold text-white ring-1 ring-inset ring-[rgb(255_255_255/0.28)]">
              <SparklesIcon className="size-3.5" />
              Amrita students only
            </span>

            <h2 className="mt-5 text-3xl font-bold leading-tight text-white">
              Find teammates
              <br />
              from your own campus.
            </h2>

            <p className="mt-4 max-w-sm text-[0.95rem] leading-relaxed text-[rgb(255_255_255/0.85)]">
              Sign in with your Amrita roll address. Your campus, school, branch
              and year come straight from it, so you can search within your own
              batch and branch without typing any of it.
            </p>

            <ul className="mt-8 space-y-3">
              {[
                "Search teammates by skill and proficiency",
                "Filter to your own year or your own branch",
                "Verified hackathon wins, checked by an admin",
                "Role-based Team Builder for the gaps in your team",
              ].map((line) => (
                <li
                  key={line}
                  className="flex items-start gap-2.5 text-[0.9rem] text-white"
                >
                  <CheckIcon className="mt-0.5 size-4 shrink-0 text-[#F2F7A0]" />
                  {line}
                </li>
              ))}
            </ul>

            <p className="mt-10 flex items-start gap-2 text-[0.8rem] text-[rgb(255_255_255/0.75)]">
              <ShieldIcon className="mt-0.5 size-4 shrink-0" />
              Your email address is never shown publicly — teammates see it only
              after a team request is accepted.
            </p>
          </div>
        </div>
      </section>

      <section className="flex flex-col justify-center">
        <div className="mx-auto w-full max-w-md">
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle ? (
            <p className="mt-2 text-[0.9rem] leading-relaxed text-ink-muted">
              {subtitle}
            </p>
          ) : null}

          <div className="mt-6">{children}</div>

          {footer ? <div className="mt-6">{footer}</div> : null}
        </div>
      </section>
    </div>
  );
}
