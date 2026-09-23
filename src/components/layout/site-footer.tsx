import Link from "next/link";
import { Logo } from "./logo";

const GROUPS = [
  {
    title: "Product",
    links: [
      { href: "/search", label: "Find people" },
      { href: "/team-builder", label: "Team Builder" },
      { href: "/events", label: "Events" },
      { href: "/events/new", label: "List an event" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/requests", label: "Requests" },
      { href: "/settings/profile", label: "Edit profile" },
      { href: "/settings", label: "Settings" },
    ],
  },
  {
    title: "About",
    links: [
      { href: "/about", label: "How it works" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-[0.83rem] leading-relaxed text-ink-muted">
            Find the right teammates for hackathons and competitions — by skill,
            role, availability and a verified track record.
          </p>
        </div>

        {GROUPS.map((group) => (
          <div key={group.title}>
            <h3 className="mb-2.5 text-[0.75rem] font-bold uppercase tracking-wider text-ink-muted">
              {group.title}
            </h3>
            <ul className="space-y-1.5">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[0.84rem] text-ink-2 transition-colors hover:text-brand"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-line px-4 py-4 sm:px-6">
        <p className="mx-auto max-w-7xl text-[0.78rem] text-ink-muted">
          © {new Date().getFullYear()} FindMyTeammate. Built for students and
          developers who would rather be building.
        </p>
      </div>
    </footer>
  );
}
