import Link from "next/link";
import { Card, CardBody, CardHead } from "@/components/ui/card";
import { Meter } from "@/components/ui/meter";
import { CheckIcon, PlusIcon } from "@/components/icons";
import { completenessBreakdown, type CompletenessInput } from "@/lib/completeness";

/**
 * Shown on the dashboard. Profiles under 60% rank lower in search, so the card
 * says so plainly instead of nagging vaguely.
 */
export function CompletenessCard({
  input,
  score,
}: {
  input: CompletenessInput;
  score: number;
}) {
  const items = completenessBreakdown(input);
  const missing = items.filter((i) => !i.done);

  return (
    <Card>
      <CardHead
        title="Profile completeness"
        description={
          score >= 80
            ? "Your profile is in great shape."
            : score >= 60
              ? "Good — a little more detail will lift you up the results."
              : "Profiles under 60% are ranked lower in search."
        }
        action={
          <span className="text-xl font-bold tabular-nums text-brand">{score}%</span>
        }
      />
      <CardBody>
        <Meter value={score} label="Profile completeness" />

        {missing.length === 0 ? (
          <p className="mt-3 flex items-center gap-2 text-[0.83rem] text-ok">
            <CheckIcon className="size-4" />
            Every section is filled in.
          </p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {missing.slice(0, 4).map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-[0.83rem] text-ink-2 transition-colors hover:bg-surface-2 hover:text-brand"
                >
                  <span className="flex items-center gap-2">
                    <PlusIcon className="size-3.5 text-ink-muted" />
                    {item.label}
                  </span>
                  <span className="shrink-0 text-[0.75rem] font-semibold text-ink-muted">
                    +{item.points - item.earned}%
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
