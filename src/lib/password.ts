import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

/** promisify() drops the options overload, so wrap scrypt directly. */
function scryptAsync(
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (error, derived) => {
      if (error) reject(error);
      else resolve(derived);
    });
  });
}

/**
 * Password hashing with scrypt from Node's standard library.
 *
 * Stored as  scrypt$N$r$p$salt$hash  so the cost parameters travel with the
 * hash and can be raised later without invalidating existing passwords.
 */

const N = 16_384; // CPU/memory cost — about 16 MB per hash
const R = 8;
const P = 1;
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scryptAsync(password.normalize("NFKC"), salt, KEY_LENGTH, {
    N,
    r: R,
    p: P,
    maxmem: 64 * 1024 * 1024,
  });

  return [
    "scrypt",
    N,
    R,
    P,
    salt.toString("base64url"),
    derived.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  stored: string | null | undefined,
): Promise<boolean> {
  if (!stored) return false;

  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, rawN, rawR, rawP, rawSalt, rawHash] = parts;
  const salt = Buffer.from(rawSalt!, "base64url");
  const expected = Buffer.from(rawHash!, "base64url");

  const derived = await scryptAsync(password.normalize("NFKC"), salt, expected.length, {
    N: Number(rawN),
    r: Number(rawR),
    p: Number(rawP),
    maxmem: 64 * 1024 * 1024,
  });

  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

// Rules live in a Node-free module so client forms can share them.
export { passwordProblem } from "./password-rules";
