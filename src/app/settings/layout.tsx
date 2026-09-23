import Link from "next/link";
import { SettingsNav } from "@/components/settings/nav";
import { requireOnboardedUser } from "@/lib/auth";

/** Shared heading and sub-navigation for every settings screen. */
export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireOnboardedUser("/settings");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <header className="mb-5">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1.5 text-[0.9rem] text-ink-muted">
          Signed in as{" "}
          <Link
            href={`/u/${user.username}`}
            className="font-medium text-brand hover:underline"
          >
            @{user.username}
          </Link>
        </p>
      </header>

      <SettingsNav />

      <div className="mt-6">{children}</div>
    </div>
  );
}
