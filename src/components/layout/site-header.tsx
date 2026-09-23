import Link from "next/link";
import { btn } from "@/components/ui/button";
import { BellIcon, InboxIcon } from "@/components/icons";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "./logo";
import {
  MobileNav,
  NavLinks,
  ThemeToggle,
  UserMenu,
  type NavLink,
} from "./header-client";

const PUBLIC_LINKS: NavLink[] = [
  { href: "/search", label: "Find people" },
  { href: "/team-builder", label: "Team Builder" },
  { href: "/events", label: "Events" },
];

export async function SiteHeader() {
  const user = await getCurrentUser();

  const links: NavLink[] = user
    ? [{ href: "/dashboard", label: "Dashboard" }, ...PUBLIC_LINKS]
    : PUBLIC_LINKS;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Logo />

        <div className="ml-2 flex-1">
          <NavLinks links={links} />
        </div>

        <div className="flex items-center gap-1">
          <ThemeToggle />

          {user ? (
            <>
              <Link
                href="/requests"
                aria-label={`Requests${user.pendingRequests ? ` (${user.pendingRequests} pending)` : ""}`}
                className="relative hidden size-9 items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink sm:inline-flex"
              >
                <InboxIcon className="size-4.5" />
                {user.pendingRequests > 0 ? <Pip count={user.pendingRequests} /> : null}
              </Link>

              <Link
                href="/notifications"
                aria-label={`Notifications${user.unreadNotifications ? ` (${user.unreadNotifications} unread)` : ""}`}
                className="relative inline-flex size-9 items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <BellIcon className="size-4.5" />
                {user.unreadNotifications > 0 ? (
                  <Pip count={user.unreadNotifications} />
                ) : null}
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
                Get started
              </Link>
            </div>
          )}

          <MobileNav links={links} signedIn={Boolean(user)} />
        </div>
      </div>
    </header>
  );
}

function Pip({ count }: { count: number }) {
  return (
    <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[0.62rem] font-bold leading-4 text-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}
