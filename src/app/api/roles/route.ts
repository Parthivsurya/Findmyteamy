import { ok, route } from "@/lib/api";
import { getRoles } from "@/lib/services/catalog";

/** GET /api/roles — the twelve standard team roles. */
export const GET = route(async () => {
  return ok({ roles: await getRoles() });
});
