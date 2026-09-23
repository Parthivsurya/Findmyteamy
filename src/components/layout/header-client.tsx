"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { btn } from "@/components/ui/button";
import {
  LayersIcon,
  LogoutIcon,
  MenuIcon,
  MoonIcon,
  SettingsIcon,
  ShieldIcon,
  SunIcon,
  UsersIcon,
  XIcon,
} from "@/components/icons";
import { logoutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

export type NavLink = { href: string; label: string };

export type HeaderUser = {
  name: string;
  username: string;
  image: string | null;
  role: string;
  profileCompleteness: number;
};

/** Light / dark toggle. The class is applied before paint by the inline script
 *  in the root layout, so this only has to keep it in sync afterwards. */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("fmt-theme", next ? "dark" : "light");
    } catch {
      // Private browsing can refuse storage; the toggle still works for the visit.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-flex size-9 items-center justify-center rounded-lg text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
    >
      {dark ? <MoonIcon className="size-4.5" /> : <SunIcon className="size-4.5" />}
    </button>
  );
}

export function UserMenu({ user }: { user: HeaderUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-1.5 rounded-full p-0.5 transition-shadow hover:shadow-card"
      >
        <Avatar name={user.name} image={user.image} size="sm" />
      </button>

      {open ? (
        <div
          role="menu"
          className="animate-in absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-xl border border-line bg-surface shadow-pop"
        >
          <div className="border-b border-line px-3 py-2.5">
            <p className="truncate text-[0.85rem] font-semibold">{user.name}</p>
            <p className="truncate text-[0.75rem] text-ink-muted">@{user.username}</p>
            <p className="mt-1 text-[0.72rem] text-ink-muted">
              Profile {user.profileCompleteness}% complete
            </p>
          </div>

          <div className="p-1">
            <MenuItem href={`/u/${user.username}`} icon={<UsersIcon className="size-4" />}>
              My public profile
            </MenuItem>
            <MenuItem href="/teams" icon={<LayersIcon className="size-4" />}>
              My teams
            </MenuItem>
            <MenuItem href="/settings" icon={<SettingsIcon className="size-4" />}>
              Settings
            </MenuItem>
            {user.role === "ADMIN" ? (
              <MenuItem href="/admin" icon={<ShieldIcon className="size-4" />}>
                Admin dashboard
              </MenuItem>
            ) : null}
          </div>

          <form action={logoutAction} className="border-t border-line p-1">
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[0.85rem] text-ink-2 transition-colors hover:bg-surface-2 hover:text-danger"
            >
              <LogoutIcon className="size-4" />
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[0.85rem] text-ink-2 transition-colors hover:bg-surface-2 hover:text-brand"
    >
      {icon}
      {children}
    </Link>
  );
}

/** Nav links, highlighted by route. Used in the desktop bar. */
export function NavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-0.5 md:flex">
      {links.map((link) => {
        const active =
          pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-1.5 text-[0.86rem] font-medium transition-colors",
              active
                ? "bg-brand-soft text-brand"
                : "text-ink-2 hover:bg-surface-2 hover:text-ink",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav({
  links,
  signedIn,
}: {
  links: NavLink[];
  signedIn: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="inline-flex size-9 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2 md:hidden"
      >
        <MenuIcon className="size-5" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-[rgb(6_12_22/0.55)] backdrop-blur-sm"
          />
          <div className="animate-in absolute inset-x-0 top-0 border-b border-line bg-surface p-4 shadow-pop">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-semibold">Menu</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="inline-flex size-9 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2"
              >
                <XIcon className="size-5" />
              </button>
            </div>

            <nav className="grid gap-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-3 py-2.5 text-[0.9rem] font-medium text-ink-2 hover:bg-surface-2 hover:text-brand"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {!signedIn ? (
              <div className="mt-3 grid gap-2 border-t border-line pt-3">
                <Link href="/login" className={btn("outline", "md")}>
                  Sign in
                </Link>
                <Link href="/login" className={btn("primary", "md")}>
                  Get started
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
