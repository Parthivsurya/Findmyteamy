import type { Metadata } from "next";
import { Card, CardBody, CardHead } from "@/components/ui/card";
import { PasswordForm } from "@/components/settings/forms";
import { requireOnboardedUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Password",
  robots: { index: false },
};

export default async function SecuritySettingsPage() {
  await requireOnboardedUser("/settings/security");

  return (
    <Card>
      <CardHead
        title="Change password"
        description="You need your current password to set a new one."
      />
      <CardBody>
        <PasswordForm />
      </CardBody>
    </Card>
  );
}
