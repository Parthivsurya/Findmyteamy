import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/forms";
import { RequestAccessForm } from "@/components/auth/request-access";
import { getCurrentUser } from "@/lib/auth";
import { formatShortRoll } from "@/lib/amrita";
import { getVouchByToken } from "@/lib/services/vouch";

export const metadata: Metadata = {
  title: "Create your account",
  description:
    "Create a FindMyTeammate account with your Amrita student email address.",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ vouch?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect(user.onboarded ? "/dashboard" : "/onboarding");

  const { vouch: token } = await searchParams;
  // Shown before they sign up, so nobody discovers what was said about them
  // only after joining.
  const vouch = token ? await getVouchByToken(token) : null;
  const usable = vouch?.usable ? vouch : null;

  return (
    <AuthShell
      title="Create your account"
      subtitle={
        usable ? (
          <>
            {usable.voucher.name} vouched for you, so this link is tied to roll{" "}
            <strong className="font-medium text-ink-2">
              {formatShortRoll(usable)}
            </strong>
            . Sign up with that address.
          </>
        ) : (
          <>
            Only Amrita student addresses can register. That is what keeps this
            to your own university.
          </>
        )
      }
      footer={
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-[0.92rem] font-medium">No vouch link?</h2>
            <p className="text-[0.85rem] leading-relaxed text-ink-muted">
              Ask someone already here to vouch for you, or request access and
              an admin will review it.
            </p>
            <RequestAccessForm />
          </div>

          <p className="rule pt-5 text-[0.85rem] text-ink-muted">
          Already registered?{" "}
          <Link href="/login" className="font-medium text-brand underline decoration-brand/30 underline-offset-2 hover:decoration-brand">
            Sign in
          </Link>
          </p>
        </div>
      }
    >
      {usable?.statement ? (
        <blockquote className="mb-5 rounded-box border border-line bg-surface-2 px-3.5 py-3">
          <p className="text-[0.88rem] leading-relaxed text-ink-2">
            “{usable.statement}”
          </p>
          <footer className="mt-1.5 text-[0.78rem] text-ink-muted">
            {usable.voucher.name}
          </footer>
        </blockquote>
      ) : null}

      {token && !usable ? (
        <p
          role="alert"
          className="mb-5 rounded-box border border-warn/30 bg-warn-soft px-3.5 py-2.5 text-[0.83rem] text-warn"
        >
          That vouch link is no longer usable. You can still ask to join below.
        </p>
      ) : null}

      <SignupForm vouchToken={usable ? token : undefined} />
    </AuthShell>
  );
}
