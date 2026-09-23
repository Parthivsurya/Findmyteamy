import { Logo } from "./logo";

/** Deliberately minimal — the header carries navigation. */
export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6">
        <Logo />
        <p className="text-[0.78rem] text-ink-muted">
          © {new Date().getFullYear()} FindMyTeammate · Amrita Vishwa Vidyapeetham
        </p>
      </div>
    </footer>
  );
}
