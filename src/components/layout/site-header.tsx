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

const PUBLIC_LINKS: NavLink[] = [
  { href: "/search", label: "Find people" },
  { href: "/team-builder", label: "Team Builder" },
  { href: "/events", label: "Events" },
];

export async function SiteHeader() {
  const user = await getCurrentUser();

  const links: NavLink[] = user
    ? [
        { href: "/dashboard", label: "Dashboard" },
        ...PUBLIC_LINKS,
        { href: "/teams", label: "My teams" },
      ]
    : PUBLIC_LINKS;

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex h-12 max-w-6xl items-center gap-3 px-4 sm:px-6">
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
                className="hidden px-2 py-1 text-[0.82rem] text-ink-2 hover:text-brand sm:inline"
              >
                Requests
                {user.pendingRequests > 0 ? ` (${user.pendingRequests})` : ""}
              </Link>
              <Link
                href="/notifications"
                className="px-2 py-1 text-[0.82rem] text-ink-2 hover:text-brand"
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
