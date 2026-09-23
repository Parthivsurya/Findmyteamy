import { ok, route } from "@/lib/api";
import { getSkills } from "@/lib/services/catalog";

/** GET /api/skills?q= — the approved master list, for autocomplete. */
export const GET = route(async (request) => {
  const query = new URL(request.url).searchParams.get("q")?.trim().toLowerCase();
  const skills = await getSkills();

  const filtered = query
    ? skills.filter((skill) => skill.name.toLowerCase().includes(query))
    : skills;

  return ok({ skills: filtered.slice(0, 200) });
});
