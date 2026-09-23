import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardBody, CardHead } from "@/components/ui/card";
import { ReportForm } from "@/components/settings/report-form";
import { ShieldIcon } from "@/components/icons";
import { requireOnboardedUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Report a student",
  robots: { index: false },
};

export default async function ReportPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const viewer = await requireOnboardedUser(`/report/${username}`);

  const reported = await db.user.findUnique({
    where: { username: username.toLowerCase() },
    select: { id: true, name: true, username: true, image: true },
  });

  if (!reported) notFound();
  if (reported.id === viewer.id) redirect("/settings");

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <ShieldIcon className="size-5 text-brand" />
          Report a student
        </h1>
        <p className="mt-1.5 text-[0.9rem] text-ink-muted">
          Reports go to the platform admins. Nothing is shown to the person you
          are reporting.
        </p>
      </header>

      <Card>
        <CardHead
          title={
            <span className="flex items-center gap-2">
              <Avatar name={reported.name} image={reported.image} size="xs" />
              {reported.name}
            </span>
          }
          description={`@${reported.username}`}
          action={
            <Link
              href={`/u/${reported.username}`}
              className="text-[0.8rem] font-medium text-brand hover:underline"
            >
              View profile
            </Link>
          }
        />
        <CardBody>
          <ReportForm reportedUserId={reported.id} name={reported.name.split(" ")[0]!} />
        </CardBody>
      </Card>
    </div>
  );
}
