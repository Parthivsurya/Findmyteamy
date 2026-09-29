import { ok, parseQuery, requireSession, route } from "@/lib/api";
import { searchPeople } from "@/lib/services/search";
import { searchQuerySchema } from "@/lib/validators";

/**
 * GET /api/search - people search with every documented filter, returning the
 * match score and the reasons behind it for each result.
 *
 * Signed in only. This used to accept an anonymous request and answer with
 * every student's name, username, branch and batch as clean JSON, which is a
 * worse exposure than the page itself because it needs no scraping.
 */
export const GET = route(async (request) => {
  const viewer = await requireSession();
  const query = parseQuery(request.url, searchQuerySchema);

  const results = await searchPeople(query, viewer.id);
  return ok(results);
});
