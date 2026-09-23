"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  isUsernameAvailable,
  parseSkillRows,
  recomputeCompleteness,
  replaceRoles,
  replaceSkills,
  setAvailability,
} from "@/lib/services/profile";
import { flattenZod } from "@/lib/api";
import {
  availabilitySchema,
  notificationPrefsSchema,
  onboardingSchema,
  profileSchema,
} from "@/lib/validators";

export type FormResult = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

const text = (data: FormData, key: string) => {
  const value = data.get(key);
  return typeof value === "string" ? value : undefined;
};
const checked = (data: FormData, key: string) => data.get(key) === "on" || data.get(key) === "true";

/** Step-by-step onboarding, submitted in one go from the wizard. */
export async function completeOnboardingAction(
  _prev: FormResult | undefined,
  formData: FormData,
): Promise<FormResult> {
  const user = await requireUser("/onboarding");

  const parsed = onboardingSchema.safeParse({
    name: text(formData, "name") ?? "",
    username: (text(formData, "username") ?? "").toLowerCase(),
    bio: text(formData, "bio"),
    college: text(formData, "college"),
    location: text(formData, "location"),
    skills: parseSkillRows(formData.getAll("skills").map(String)),
    roleIds: formData.getAll("roleIds").map(String).filter(Boolean),
    githubUrl: text(formData, "githubUrl"),
    linkedinUrl: text(formData, "linkedinUrl"),
    portfolioUrl: text(formData, "portfolioUrl"),
    availability: text(formData, "availability") ?? "OPEN",
  });

  if (!parsed.success) {
    return { error: "Please fix the highlighted fields", fieldErrors: flattenZod(parsed.error) };
  }
  const data = parsed.data;

  if (!(await isUsernameAvailable(data.username, user.id))) {
    return {
      error: "That username is taken",
      fieldErrors: { username: "Someone already has this username" },
    };
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      name: data.name,
      username: data.username,
      bio: data.bio,
      college: data.college,
      location: data.location,
      githubUrl: data.githubUrl,
      linkedinUrl: data.linkedinUrl,
      portfolioUrl: data.portfolioUrl,
      availability: data.availability,
      availabilityUpdatedAt: new Date(),
      onboarded: true,
    },
  });

  await replaceSkills(user.id, data.skills);
  await replaceRoles(user.id, data.roleIds);

  revalidatePath("/dashboard");
  redirect("/dashboard?welcome=1");
}

export async function updateProfileAction(
  _prev: FormResult | undefined,
  formData: FormData,
): Promise<FormResult> {
  const user = await requireUser("/settings/profile");

  const parsed = profileSchema.safeParse({
    name: text(formData, "name") ?? "",
    username: (text(formData, "username") ?? "").toLowerCase() || undefined,
    bio: text(formData, "bio"),
    college: text(formData, "college"),
    location: text(formData, "location"),
    image: text(formData, "image"),
    githubUrl: text(formData, "githubUrl"),
    linkedinUrl: text(formData, "linkedinUrl"),
    portfolioUrl: text(formData, "portfolioUrl"),
    resumeUrl: text(formData, "resumeUrl"),
    showGithub: checked(formData, "showGithub"),
    showLinkedin: checked(formData, "showLinkedin"),
    showPortfolio: checked(formData, "showPortfolio"),
  });

  if (!parsed.success) {
    return { error: "Please fix the highlighted fields", fieldErrors: flattenZod(parsed.error) };
  }
  const data = parsed.data;

  if (data.username && !(await isUsernameAvailable(data.username, user.id))) {
    return {
      error: "That username is taken",
      fieldErrors: { username: "Someone already has this username" },
    };
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      name: data.name,
      ...(data.username ? { username: data.username } : {}),
      bio: data.bio ?? null,
      college: data.college ?? null,
      location: data.location ?? null,
      image: data.image ?? null,
      githubUrl: data.githubUrl ?? null,
      linkedinUrl: data.linkedinUrl ?? null,
      portfolioUrl: data.portfolioUrl ?? null,
      resumeUrl: data.resumeUrl ?? null,
      showGithub: data.showGithub ?? true,
      showLinkedin: data.showLinkedin ?? true,
      showPortfolio: data.showPortfolio ?? true,
    },
  });

  await recomputeCompleteness(user.id);
  revalidatePath("/settings/profile");
  revalidatePath(`/u/${data.username ?? user.username}`);

  return { ok: true };
}

export async function updateSkillsAction(
  _prev: FormResult | undefined,
  formData: FormData,
): Promise<FormResult> {
  const user = await requireUser("/settings/skills");

  const skills = parseSkillRows(formData.getAll("skills").map(String));
  const roleIds = formData.getAll("roleIds").map(String).filter(Boolean);

  if (roleIds.length > 3) {
    return { error: "Choose at most three roles" };
  }

  await replaceSkills(user.id, skills);
  await replaceRoles(user.id, roleIds);

  revalidatePath("/settings/skills");
  revalidatePath(`/u/${user.username}`);

  return { ok: true };
}

export async function updateAvailabilityAction(formData: FormData) {
  const user = await requireUser();
  const parsed = availabilitySchema.safeParse({
    availability: text(formData, "availability"),
  });
  if (!parsed.success) return;

  await setAvailability(user.id, parsed.data.availability);
  revalidatePath("/dashboard");
  revalidatePath(`/u/${user.username}`);
}

export async function updateNotificationPrefsAction(
  _prev: FormResult | undefined,
  formData: FormData,
): Promise<FormResult> {
  const user = await requireUser("/settings");

  const parsed = notificationPrefsSchema.safeParse({
    emailOnRequests: checked(formData, "emailOnRequests"),
    emailOnVerification: checked(formData, "emailOnVerification"),
    emailWeeklyDigest: checked(formData, "emailWeeklyDigest"),
  });
  if (!parsed.success) return { error: "Could not save those preferences" };

  await db.user.update({ where: { id: user.id }, data: parsed.data });
  revalidatePath("/settings");
  return { ok: true };
}
