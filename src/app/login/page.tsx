import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/forms";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { academicSummary } from "@/lib/amrita";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to FindMyTeammate with your Amrita student email address to find teammates for hackathons.",
};

const ERRORS: Record<string, string> = {
  "session-expired": "Your session expired. Please sign in again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(user.onboarded ? (next ?? "/dashboard") : "/onboarding");

  // Local exploration: the seed gives every demo account the same password.
  const demoAllowed = process.env.ALLOW_DEMO_LOGIN === "true";
  const demoPassword = process.env.DEMO_PASSWORD ?? "Amrita@2026";
  const demoAccounts = demoAllowed
    ? await db.user.findMany({
        where: { emailVerifiedAt: { not: null }, onboarded: true },
        orderBy: [{ role: "desc" }, { profileCompleteness: "desc" }],
        take: 4,
        select: {
          name: true,
          email: true,
          image: true,
          role: true,
          branchCode: true,
          joiningYear: true,
          programYears: true,
        },
      })
    : [];

  return (
    <AuthShell
      title="Sign in"
      subtitle="Use the Amrita email address your college gave you."
      footer={
        <div className="space-y-5">
          <p className="text-[0.85rem] text-ink-muted">
            New here?{" "}
            <Link href="/signup" className="font-semibold text-brand hover:underline">
              Create an account
            </Link>
          </p>

          {demoAccounts.length ? (
            <div>
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-line" />
                <span className="text-[0.7rem] font-bold uppercase tracking-wider text-ink-muted">
                  Demo accounts for local testing
                </span>
                <span className="h-px flex-1 bg-line" />
              </div>

              <Card className="mt-3 divide-y divide-[var(--line)]">
                {demoAccounts.map((account) => (
                  <div
                    key={account.email}
                    className="flex items-center gap-3 px-3.5 py-2.5"
                  >
                    <Avatar name={account.name} image={account.image} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate text-[0.85rem] font-semibold">
                        {account.name}
                        {account.role === "ADMIN" ? (
                          <Badge tone="brand">Admin</Badge>
                        ) : null}
                      </p>
                      <p className="truncate font-mono text-[0.68rem] text-ink-muted">
                        {account.email}
                      </p>
                    </div>
                    <span className="shrink-0 text-[0.7rem] font-medium text-ink-muted">
                      {academicSummary(account)}
                    </span>
                  </div>
                ))}
              </Card>

              <p className="mt-2 text-[0.75rem] leading-relaxed text-ink-muted">
                All demo accounts use the password{" "}
                <code className="font-mono font-semibold text-ink-2">
                  {demoPassword}
                </code>
                . Set <code className="font-mono">ALLOW_DEMO_LOGIN=false</code> before
                deploying.
              </p>
            </div>
          ) : null}
        </div>
      }
    >
      {error ? (
        <p
          role="alert"
          className="mb-4 rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-[0.83rem] text-danger"
        >
          {ERRORS[error] ?? "Something went wrong. Please try again."}
        </p>
      ) : null}

      <LoginForm next={next} />
    </AuthShell>
  );
}
