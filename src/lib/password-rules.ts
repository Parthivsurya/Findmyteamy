/**
 * Password rules, kept free of Node built-ins so that both the client form and
 * the server action can import them and never disagree.
 */

const COMMON = [
  "password", "12345678", "qwerty123", "amrita123", "iloveyou",
  "admin123", "welcome1", "letmein1", "amrita@123",
];

/** Returns null when the password is acceptable, otherwise what to fix. */
export function passwordProblem(password: string): string | null {
  if (password.length < 8) return "Use at least 8 characters";
  if (password.length > 200) return "That password is too long";
  if (!/[a-zA-Z]/.test(password)) return "Include at least one letter";
  if (!/[0-9]/.test(password)) return "Include at least one number";
  if (/^(.)\1+$/.test(password)) return "That is the same character repeated";
  if (COMMON.includes(password.toLowerCase())) {
    return "That password is too easy to guess";
  }
  return null;
}
