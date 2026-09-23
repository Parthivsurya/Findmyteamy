import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/forms";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Create your account",
  description:
    "Create a FindMyTeammate account with your Amrita student email address.",
};

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.onboarded ? "/dashboard" : "/onboarding");

  return (
    <AuthShell
      title="Create your account"
      subtitle={
        <>
          Only Amrita student addresses can register — that is what keeps this
          to your own university.
        </>
      }
      footer={
        <div className="space-y-4">
          <p className="text-[0.85rem] text-ink-muted">
            Already registered?{" "}
            <Link href="/login" className="font-semibold text-brand hover:underline">
              Sign in
            </Link>
          </p>

          <div className="rounded-xl border border-line bg-surface-2 p-3.5">
            <p className="text-[0.75rem] font-bold uppercase tracking-wider text-ink-muted">
              How your address is read
            </p>
            <p className="mt-2 break-all font-mono text-[0.78rem] text-ink-2">
              cb.sc.u4cse24535@cb.students.amrita.edu
            </p>
            <ul className="mt-2.5 space-y-1 text-[0.78rem] text-ink-muted">
              <li>
                <code className="font-mono text-ink-2">cb</code> — Coimbatore campus
              </li>
              <li>
                <code className="font-mono text-ink-2">sc</code> — School of Computing
              </li>
              <li>
                <code className="font-mono text-ink-2">u4</code> — undergraduate, four years
              </li>
              <li>
                <code className="font-mono text-ink-2">cse</code> — branch
              </li>
              <li>
                <code className="font-mono text-ink-2">24</code> — joined 2024
              </li>
            </ul>
          </div>
        </div>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
