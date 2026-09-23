#!/usr/bin/env node
/**
 * Sets the Prisma datasource provider from the DATABASE_PROVIDER environment
 * variable, because Prisma does not accept env() for `provider`.
 *
 *   DATABASE_PROVIDER=sqlite      → local development, no services needed
 *   DATABASE_PROVIDER=postgresql  → production (Neon, Supabase, or your own)
 *
 * Runs automatically before dev, build and the db:* scripts, so the schema
 * always matches the database the app is about to talk to.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const SUPPORTED = ["sqlite", "postgresql"];

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = join(root, "prisma", "schema.prisma");

// Read DATABASE_PROVIDER from the environment, falling back to .env.
function resolveProvider() {
  if (process.env.DATABASE_PROVIDER) return process.env.DATABASE_PROVIDER.trim();

  try {
    const env = readFileSync(join(root, ".env"), "utf8");
    const match = /^DATABASE_PROVIDER\s*=\s*"?([a-z]+)"?/m.exec(env);
    if (match) return match[1];
  } catch {
    // No .env yet — fall through to the default.
  }
  return "sqlite";
}

const provider = resolveProvider();

if (!SUPPORTED.includes(provider)) {
  console.error(
    `[set-db-provider] Unknown DATABASE_PROVIDER "${provider}". Use one of: ${SUPPORTED.join(", ")}`,
  );
  process.exit(1);
}

const schema = readFileSync(schemaPath, "utf8");
const updated = schema.replace(
  /(datasource db \{[^}]*?provider\s*=\s*)"[a-z]+"/s,
  `$1"${provider}"`,
);

if (updated === schema) {
  // Already correct; keep the file's mtime stable so Prisma does not regenerate.
  process.exit(0);
}

writeFileSync(schemaPath, updated);
console.log(`[set-db-provider] datasource provider set to "${provider}"`);
