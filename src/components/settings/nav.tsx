"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/settings/profile", label: "Profile" },
  { href: "/settings/skills", label: "Skills and roles" },
  { href: "/settings/achievements", label: "Achievements" },
  { href: "/settings/vouches", label: "Vouches" },
  { href: "/settings/security", label: "Password" },
  { href: "/settings", label: "Privacy and email" },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <div className="scrollbar-slim flex gap-1 overflow-x-auto border-b border-line">
      {TABS.map((tab) => {
        // Exact match, so "Profile" does not light up on /settings itself.
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-3 py-2.5 text-[0.85rem] font-medium transition-colors",
              active
                ? "border-brand text-brand"
                : "border-transparent text-ink-muted hover:border-line-strong hover:text-ink",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
