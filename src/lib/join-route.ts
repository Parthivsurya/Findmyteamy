/**
 * How an account got in, in words.
 *
 * One place, because the same label appears on a profile, in the admin forest
 * and on the settings screen, and three copies would drift apart.
 */
export const JOIN_ROUTE_LABEL: Record<string, string> = {
  VOUCH: "Vouched in",
  ADMIN: "Added by an admin",
  REQUEST: "Joined by request",
  WITHDRAWN: "Vouch withdrawn",
  SEED: "Founding member",
};

export function joinRouteLabel(value: string | null | undefined): string {
  return JOIN_ROUTE_LABEL[value ?? "SEED"] ?? "Founding member";
}
