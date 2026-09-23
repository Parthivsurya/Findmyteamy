#!/usr/bin/env node
/**
 * Promotes a student to ADMIN.
 *
 *   npm run make-admin -- cb.sc.u4cse24535@cb.students.amrita.edu
 *
 * Needed once on a fresh production database: the production seed creates only
 * skills and roles, so the first admin has to be promoted after signing up
 * normally through the website.
 */

import { PrismaClient } from "@prisma/client";

const email = process.argv[2]?.trim().toLowerCase();

if (!email) {
  console.error("Usage: npm run make-admin -- <amrita email address>");
  process.exit(1);
}

const db = new PrismaClient();

try {
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, name: true, role: true, emailVerifiedAt: true },
  });

  if (!user) {
    console.error(`No account for ${email}.`);
    console.error("Sign up through the website first, then run this again.");
    process.exit(1);
  }

  if (user.role === "ADMIN") {
    console.log(`${user.name} is already an admin.`);
    process.exit(0);
  }

  await db.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });

  console.log(`${user.name} (${email}) is now an admin.`);
  if (!user.emailVerifiedAt) {
    console.log("Note: their email address is not confirmed yet, so they cannot sign in until it is.");
  }
} finally {
  await db.$disconnect();
}
