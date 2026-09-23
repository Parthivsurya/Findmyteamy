import { ok, parseQuery, route } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { searchPeople } from "@/lib/services/search";
import { searchQuerySchema } from "@/lib/validators";

/**
 * GET /api/search — people search with every documented filter, returning the
 * match score and the reasons behind it for each result.
 */
export const GET = route(async (request) => {
  const query = parseQuery(request.url, searchQuerySchema);
  const viewer = await getCurrentUser();

  const results = await searchPeople(query, viewer?.id);
  return ok(results);
});
