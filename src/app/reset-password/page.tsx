import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/forms";

export const metadata: Metadata = {
  title: "Set a new password",
  robots: { index: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; dev?: string }>;
}) {
  const { email, dev } = await searchParams;
  if (!email) redirect("/forgot-password");

  return (
    <AuthShell
      title="Set a new password"
      subtitle="Enter the code from the email, then choose a new password."
    >
      <ResetPasswordForm email={email} devCode={dev} />
    </AuthShell>
  );
}
