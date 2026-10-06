import Link from "next/link";
import { btn } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "./logo";
import {
  MobileNav,
  NavLinks,
  ThemeToggle,
  UserMenu,
  type NavLink,
} from "./header-client";

/**
 * Finding people and building a team both need a session now, so offering them
 * to a signed-out visitor would only bounce them to the login screen. Events
 * stay open, because reading what a hackathon is does not expose anyone.
 */
/**
 * Team Builder and Events are unlinked for now, at the owner's request, to be
 * brought back later. The routes, services and data are all untouched: events
 * are eighteen references deep inside search and the match score, so removing
 * the model would be a large change to undo rather than a small one to
 * reverse. Hiding the entry points is one commit in either direction.
 */
const SIGNED_OUT_LINKS: NavLink[] = [];

const SIGNED_IN_LINKS: NavLink[] = [
  { href: "/search", label: "Find people" },
];

export async function SiteHeader() {
  const user = await getCurrentUser();

  const links: NavLink[] = user
    ? [
        { href: "/dashboard", label: "Dashboard" },
        ...SIGNED_IN_LINKS,
        // "My teams" is unlinked with the rest: a team belongs to an event, so
        // with events deferred it is a page you can read but never add to.
      ]
    : SIGNED_OUT_LINKS;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface">
      <div className="mx-auto flex h-[52px] max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Logo />

        <div className="ml-3 flex h-full flex-1">
          <NavLinks links={links} />
        </div>

        <div className="flex items-center gap-1">
          <ThemeToggle />

          {user ? (
            <>
              <Link
                href="/requests"
                className="hidden rounded-box px-2 py-1 text-[0.82rem] text-ink-muted transition-colors duration-120 hover:text-ink sm:inline"
              >
                Requests
                {user.pendingRequests > 0 ? ` (${user.pendingRequests})` : ""}
              </Link>
              <Link
                href="/notifications"
                className="rounded-box px-2 py-1 text-[0.82rem] text-ink-muted transition-colors duration-120 hover:text-ink"
              >
                Alerts
                {user.unreadNotifications > 0 ? ` (${user.unreadNotifications})` : ""}
              </Link>
              <div className="ml-1 hidden md:block">
                <UserMenu
                  user={{
                    name: user.name,
                    username: user.username,
                    image: user.image,
                    role: user.role,
                    profileCompleteness: user.profileCompleteness,
                  }}
                />
              </div>
            </>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link href="/login" className={btn("ghost", "sm")}>
                Sign in
              </Link>
              <Link href="/signup" className={btn("primary", "sm")}>
                Sign up
              </Link>
            </div>
          )}

          <MobileNav links={links} signedIn={Boolean(user)} />
        </div>
      </div>
    </header>
  );
}
