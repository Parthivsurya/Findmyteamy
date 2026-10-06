import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyForm } from "@/components/auth/forms";

export const metadata: Metadata = {
  title: "Confirm your email",
  robots: { index: false },
};

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; dev?: string; unverified?: string }>;
}) {
  const { email, dev, unverified } = await searchParams;
  if (!email) redirect("/signup");

  return (
    <AuthShell
      title="Confirm your email"
      subtitle={
        unverified
          ? "Your address has not been confirmed yet. Enter the code we just emailed you."
          : "We emailed a six-digit code to your Amrita address. Enter it to finish setting up your account. If it is not in your inbox, look in Junk: the university mail filter often files our messages there."
      }
      footer={
        <p className="text-[0.85rem] text-ink-muted">
          Wrong address?{" "}
          <Link href="/signup" className="font-medium text-brand underline decoration-brand/30 underline-offset-2 hover:decoration-brand">
            Start again
          </Link>
        </p>
      }
    >
      <VerifyForm email={email} devCode={dev} />
    </AuthShell>
  );
}
