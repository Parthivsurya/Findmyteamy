import type { Metadata } from "next";
import { Card, CardBody } from "@/components/ui/card";
import { EventForm } from "@/components/events/event-form";
import { requireOnboardedUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "List an event",
  description: "Submit a hackathon or competition so participants can find teammates for it.",
};

export default async function NewEventPage() {
  const user = await requireOnboardedUser("/events/new");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">List an event</h1>
        <p className="mt-1.5 text-[0.9rem] text-ink-muted">
          Add a hackathon or competition so participants without a team can find
          each other for it. Team size limits here are enforced when people form
          teams.
        </p>
      </header>

      <Card>
        <CardBody className="p-5 sm:p-6">
          <EventForm isAdmin={user.role === "ADMIN"} />
        </CardBody>
      </Card>
    </div>
  );
}
