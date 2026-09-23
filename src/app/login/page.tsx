import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { btn } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  CheckIcon,
  GithubIcon,
  GoogleIcon,
  ShieldIcon,
  SparklesIcon,
} from "@/components/icons";
import { demoLoginAction } from "@/lib/actions/auth";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isProviderConfigured } from "@/lib/oauth";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to FindMyTeammate with GitHub or Google to build your profile and find teammates.",
};

const ERRORS: Record<string, string> = {
  "access-denied": "You cancelled the sign-in. Nothing was saved.",
  "missing-code": "That sign-in link expired. Please try again.",
  "state-mismatch": "The sign-in request could not be verified. Please try again.",
  "sign-in-failed": "We could not complete sign-in. Please try again.",
  "unknown-provider": "That sign-in provider is not available.",
  "provider-not-configured":
    "That provider has no credentials configured yet. Use a demo account below, or add the client ID and secret to your .env file.",
  "demo-disabled": "Demo sign-in is switched off on this deployment.",
  "unknown-demo-account": "That demo account does not exist.",
  "missing-email": "Pick one of the demo accounts to continue.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(user.onboarded ? (next ?? "/dashboard") : "/onboarding");

  const githubReady = isProviderConfigured("github");
  const googleReady = isProviderConfigured("google");
  const demoAllowed = process.env.ALLOW_DEMO_LOGIN === "true";

  const demoAccounts = demoAllowed
    ? await db.user.findMany({
        where: { accounts: { some: { provider: "demo" } } },
        orderBy: [{ role: "desc" }, { profileCompleteness: "desc" }],
        take: 5,
        select: {
          name: true,
          email: true,
          username: true,
          image: true,
          role: true,
          college: true,
          _count: { select: { achievements: { where: { status: "VERIFIED" } } } },
        },
      })
    : [];

  const nextParam = next ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:py-16">
      {/* ------------------------------------------------------ pitch (left) */}
      <section className="hidden lg:block">
        <div className="hero-grid relative h-full overflow-hidden rounded-2xl brand-gradient p-8">
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgb(255_255_255/0.16)] px-3 py-1 text-[0.75rem] font-semibold text-white ring-1 ring-inset ring-[rgb(255_255_255/0.28)]">
              <SparklesIcon className="size-3.5" />
              No passwords to remember
            </span>

            <h2 className="mt-5 text-3xl font-bold leading-tight text-white">
              One profile.
              <br />
              Every hackathon team.
            </h2>

            <p className="mt-4 max-w-sm text-[0.95rem] leading-relaxed text-[rgb(255_255_255/0.85)]">
              Sign in with GitHub and we will pull in your profile link and
              avatar automatically, so onboarding takes about five minutes.
            </p>

            <ul className="mt-8 space-y-3">
              {[
                "Structured skills with proficiency levels",
                "Verified hackathon wins, checked by an admin",
                "Availability per event, so nobody wastes a message",
                "Role-slot search that fills the gaps in your team",
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

            <p className="mt-10 flex items-center gap-2 text-[0.8rem] text-[rgb(255_255_255/0.75)]">
              <ShieldIcon className="size-4" />
              Your email address is never shown publicly.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- sign-in (right) */}
      <section className="flex flex-col justify-center">
        <div className="mx-auto w-full max-w-md">
          <h1 className="text-2xl font-bold">Sign in to FindMyTeammate</h1>
          <p className="mt-2 text-[0.9rem] text-ink-muted">
            New here? Signing in creates your account and starts onboarding.
          </p>

          {error ? (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-[0.85rem] text-danger"
            >
              {ERRORS[error] ?? "Something went wrong. Please try again."}
            </div>
          ) : null}

          <div className="mt-6 space-y-2.5">
            <ProviderButton
              href={`/api/auth/github${nextParam}`}
              ready={githubReady}
              label="Continue with GitHub"
              recommended
              icon={<GithubIcon className="size-4.5" />}
            />
            <ProviderButton
              href={`/api/auth/google${nextParam}`}
              ready={googleReady}
              label="Continue with Google"
              icon={<GoogleIcon className="size-4.5" />}
            />
          </div>

          {!githubReady && !googleReady ? (
            <p className="mt-4 rounded-xl border border-line bg-surface-2 px-4 py-3 text-[0.8rem] leading-relaxed text-ink-muted">
              No OAuth credentials are configured yet. Add{" "}
              <code className="font-mono text-[0.78rem] text-ink-2">
                GITHUB_CLIENT_ID
              </code>{" "}
              and{" "}
              <code className="font-mono text-[0.78rem] text-ink-2">
                GITHUB_CLIENT_SECRET
              </code>{" "}
              to your <code className="font-mono text-[0.78rem] text-ink-2">.env</code>{" "}
              file to enable real sign-in. Until then, use a demo account below.
            </p>
          ) : null}

          {demoAccounts.length ? (
            <div className="mt-8">
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-line" />
                <span className="text-[0.72rem] font-bold uppercase tracking-wider text-ink-muted">
                  Or explore with a demo account
                </span>
                <span className="h-px flex-1 bg-line" />
              </div>

              <Card className="mt-4 divide-y divide-[var(--line)]">
                {demoAccounts.map((account) => (
                  <form
                    key={account.email}
                    action={demoLoginAction}
                    className="flex items-center gap-3 px-3.5 py-2.5"
                  >
                    <input type="hidden" name="email" value={account.email} />
                    {next ? (
                      <input type="hidden" name="next" value={next} />
                    ) : null}

                    <Avatar name={account.name} image={account.image} size="sm" />

                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate text-[0.87rem] font-semibold">
                        {account.name}
                        {account.role === "ADMIN" ? (
                          <Badge tone="brand">Admin</Badge>
                        ) : null}
                        {account._count.achievements > 0 ? (
                          <Badge tone="lime">
                            {account._count.achievements} verified
                          </Badge>
                        ) : null}
                      </p>
                      <p className="truncate text-[0.75rem] text-ink-muted">
                        {account.college ?? `@${account.username}`}
                      </p>
                    </div>

                    <button type="submit" className={btn("outline", "sm")}>
                      Sign in
                    </button>
                  </form>
                ))}
              </Card>

              <p className="mt-3 text-[0.75rem] leading-relaxed text-ink-muted">
                Demo sign-in only works for seeded accounts and is controlled by{" "}
                <code className="font-mono">ALLOW_DEMO_LOGIN</code>. Switch it off
                before deploying.
              </p>
            </div>
          ) : null}

          <p className="mt-8 text-[0.78rem] leading-relaxed text-ink-muted">
            By continuing you agree to our{" "}
            <Link href="/terms" className="text-brand hover:underline">
              terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-brand hover:underline">
              privacy policy
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}

function ProviderButton({
  href,
  ready,
  label,
  icon,
  recommended = false,
}: {
  href: string;
  ready: boolean;
  label: string;
  icon: React.ReactNode;
  recommended?: boolean;
}) {
  if (!ready) {
    return (
      <div
        className={btn(
          "outline",
          "lg",
          "w-full cursor-not-allowed justify-start gap-3 opacity-55",
        )}
        aria-disabled="true"
        title="Add this provider's client ID and secret to .env to enable it"
      >
        {icon}
        {label}
        <span className="ml-auto text-[0.72rem] font-medium text-ink-muted">
          not configured
        </span>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={btn(
        recommended ? "primary" : "outline",
        "lg",
        "w-full justify-start gap-3",
      )}
    >
      {icon}
      {label}
      {recommended ? (
        <span className="ml-auto rounded-full bg-[rgb(255_255_255/0.2)] px-2 py-0.5 text-[0.68rem] font-bold">
          Recommended
        </span>
      ) : null}
    </Link>
  );
}
