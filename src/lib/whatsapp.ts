/**
 * WhatsApp numbers.
 *
 * `wa.me` accepts exactly one shape: country code and number, digits only, no
 * plus and no separators. Everything else gives a page saying the number is
 * invalid, which from the student's side looks like the site is broken rather
 * than like they typed it oddly. So numbers are normalised on the way in and
 * the stored value is always link-ready.
 *
 * India is assumed when no country code is given, because every member has an
 * Amrita address. A ten-digit number starting 6 to 9 is the Indian mobile
 * format, so that case is unambiguous and worth handling rather than making
 * people type 91 themselves.
 */

const INDIA = "91";

/** Digits only, with the common ways people write a plus stripped. */
function digits(raw: string): string {
  return raw.replace(/\D/g, "");
}

/**
 * Turns what someone typed into the form wa.me needs, or null if it cannot be
 * a real mobile number.
 *
 * Accepts "9876543210", "+91 98765 43210", "0091-9876543210", "919876543210".
 */
export function normaliseWhatsapp(raw: string): string | null {
  let value = digits(raw);
  if (!value) return null;

  // 00 is the international prefix in the form a lot of people still write.
  if (value.startsWith("00")) value = value.slice(2);

  // A bare Indian mobile: ten digits, first one 6-9.
  if (/^[6-9]\d{9}$/.test(value)) return INDIA + value;

  // A leading 0 before a bare Indian mobile, as dialled domestically.
  if (/^0[6-9]\d{9}$/.test(value)) return INDIA + value.slice(1);

  // Already carries the Indian country code.
  if (/^91[6-9]\d{9}$/.test(value)) return value;

  // Some other country. Accept a plausible length rather than trying to
  // validate every national format, since the only real failure mode is a
  // dead link and the owner can see that themselves.
  if (value.length >= 10 && value.length <= 15) return value;

  return null;
}

/** The message shown when a number will not normalise. */
export function whatsappProblem(raw: string): string | null {
  if (!raw.trim()) return null;
  return normaliseWhatsapp(raw)
    ? null
    : "That does not look like a WhatsApp number. A 10-digit mobile is enough.";
}

/** The link that opens a chat. */
export function whatsappLink(stored: string, message?: string): string {
  const base = `https://wa.me/${digits(stored)}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** How a stored number is shown back to its owner, grouped to be readable. */
export function formatWhatsapp(stored: string): string {
  const value = digits(stored);
  if (value.startsWith(INDIA) && value.length === 12) {
    return `+91 ${value.slice(2, 7)} ${value.slice(7)}`;
  }
  return `+${value}`;
}
