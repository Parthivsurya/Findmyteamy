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
          Only Amrita student addresses can register. That is what keeps this
          to your own university.
        </>
      }
      footer={
        <p className="text-[0.85rem] text-ink-muted">
          Already registered?{" "}
          <Link href="/login" className="font-medium text-brand underline decoration-brand/30 underline-offset-2 hover:decoration-brand">
            Sign in
          </Link>
        </p>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
