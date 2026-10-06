import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { joinRouteLabel } from "@/lib/join-route";
import type { VouchNode } from "@/lib/services/vouch";

/**
 * The vouch forest.
 *
 * Rendered as nested indented rows rather than a drawn graph: at campus scale
 * the useful questions are "who brought this person in" and "who is bringing
 * in a lot of people", and an indented list answers both at a glance while
 * staying readable on a phone.
 *
 * The descendant count is the number worth watching. Collusion shows up as one
 * account with an unusually large subtree, which is visible here without any
 * scoring or detection logic.
 */
function Row({ node }: { node: VouchNode }) {
  return (
    <li>
      <div className="flex flex-wrap items-center gap-2 py-1.5">
        <Link
          href={`/u/${node.username}`}
          className="text-[0.85rem] font-medium hover:text-brand"
        >
          {node.name}
        </Link>
        <span className="font-mono text-[0.75rem] text-ink-muted">
          @{node.username}
        </span>

        {node.depth === 0 ? (
          <Badge tone={node.joinedVia === "ADMIN" ? "brand" : "neutral"}>
            {joinRouteLabel(node.joinedVia)}
          </Badge>
        ) : null}

        {node.descendants > 0 ? (
          <span className="text-[0.75rem] tabular-nums text-ink-muted">
            {node.descendants} below
          </span>
        ) : null}
      </div>

      {node.statement ? (
        <p className="mb-1 max-w-prose border-l-2 border-line pl-2.5 text-[0.8rem] leading-relaxed text-ink-muted">
          “{node.statement}”
        </p>
      ) : null}

      {node.children.length ? (
        <ul className="ml-3 border-l border-line pl-3">
          {node.children.map((child) => (
            <Row key={child.id} node={child} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function VouchTree({
  roots,
  totals,
}: {
  roots: VouchNode[];
  totals: { accounts: number; vouched: number; roots: number; deepest: number };
}) {
  const withChildren = roots.filter((r) => r.children.length > 0);
  const alone = roots.length - withChildren.length;

  return (
    <div className="space-y-3">
      <dl className="flex flex-wrap gap-x-6 gap-y-1 text-[0.8rem]">
        {[
          ["Accounts", totals.accounts],
          ["Vouched in", totals.vouched],
          ["Roots", totals.roots],
          ["Deepest chain", totals.deepest],
        ].map(([label, value]) => (
          <div key={label as string} className="flex gap-1.5">
            <dt className="text-ink-muted">{label}</dt>
            <dd className="font-medium tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      {withChildren.length === 0 ? (
        <p className="text-[0.85rem] text-ink-muted">
          Nobody has been vouched in yet, so every account is its own root.
        </p>
      ) : (
        <ul className="scrollbar-slim max-h-[28rem] overflow-y-auto">
          {withChildren.map((root) => (
            <Row key={root.id} node={root} />
          ))}
        </ul>
      )}

      {alone > 0 ? (
        <p className="text-[0.78rem] text-ink-muted">
          {alone} {alone === 1 ? "account has" : "accounts have"} vouched nobody
          in, and {alone === 1 ? "is" : "are"} hidden here.
        </p>
      ) : null}
    </div>
  );
}
