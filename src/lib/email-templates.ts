import { appUrl } from "./env";

/**
 * Transactional email templates.
 *
 * Written to the conventions that actually matter in mail clients rather than
 * on the web:
 *
 *   - Table-based layout with inline styles. Outlook renders with Word's engine,
 *     which supports neither flexbox nor grid, so a div-based layout collapses.
 *   - A 600px maximum width, the safe width across desktop clients.
 *   - Hidden preheader text, so the inbox preview line says something useful
 *     instead of repeating the subject or leaking the first stray words.
 *   - A plain-text alternative for every message, which spam filters expect and
 *     which is what terminal and accessibility clients render.
 *   - Explicit colours on every element: clients strip <style> blocks and some
 *     invert unstyled backgrounds in dark mode.
 *   - An unsubscribe or preferences line on anything not strictly required,
 *     and a stated reason the message was received.
 */

const BRAND = "#2373F4";
const INK = "#1a1c1f";
const MUTED = "#6b7078";
const LINE = "#dcdfe4";
const CANVAS = "#f5f6f8";

export type EmailContent = { subject: string; text: string; html: string };

type LayoutInput = {
  /** Inbox preview line. Kept short; clients truncate around 90 characters. */
  preheader: string;
  heading: string;
  /** Already-escaped HTML for the message body. */
  bodyHtml: string;
  cta?: { label: string; href: string };
  /** Why this message was received, and how to stop it. */
  footerNote: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${INK}">${escapeHtml(text)}</p>`;
}

function layout({ preheader, heading, bodyHtml, cta, footerNote }: LayoutInput): string {
  const base = appUrl();

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background-color:${CANVAS};-webkit-font-smoothing:antialiased">
<!-- Preheader: shown in the inbox list, hidden in the message itself. -->
<div style="display:none;font-size:1px;color:${CANVAS};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">
${escapeHtml(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${CANVAS}">
  <tr>
    <td align="center" style="padding:24px 12px">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px">

        <tr>
          <td style="padding:0 0 16px">
            <span style="font-size:16px;font-weight:600;color:${INK};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">FindMy<span style="color:${BRAND}">Teammate</span></span>
          </td>
        </tr>

        <tr>
          <td style="background-color:#ffffff;border:1px solid ${LINE};border-radius:6px;padding:28px 28px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">
            <h1 style="margin:0 0 16px;font-size:19px;line-height:1.3;font-weight:600;color:${INK}">${escapeHtml(heading)}</h1>
            ${bodyHtml}
            ${
              cta
                ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px">
              <tr><td style="background-color:${BRAND};border-radius:4px">
                <a href="${cta.href}" style="display:inline-block;padding:11px 20px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none">${escapeHtml(cta.label)}</a>
              </td></tr>
            </table>`
                : ""
            }
          </td>
        </tr>

        <tr>
          <td style="padding:16px 4px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">
            <p style="margin:0 0 6px;font-size:12px;line-height:1.5;color:${MUTED}">${escapeHtml(footerNote)}</p>
            <p style="margin:0;font-size:12px;line-height:1.5;color:${MUTED}">
              FindMyTeammate · Amrita Vishwa Vidyapeetham ·
              <a href="${base}" style="color:${MUTED}">${escapeHtml(base.replace(/^https?:\/\//, ""))}</a>
            </p>
            <p style="margin:6px 0 0;font-size:12px;line-height:1.5;color:${MUTED}">This mailbox is not monitored, so please do not reply.</p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/** Wraps the plain-text alternative with the same framing as the HTML. */
function textLayout(lines: string[], footerNote: string): string {
  const base = appUrl();
  return [
    "FindMyTeammate",
    "",
    ...lines,
    "",
    "--",
    footerNote,
    `FindMyTeammate · Amrita Vishwa Vidyapeetham · ${base}`,
    "This mailbox is not monitored, so please do not reply.",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// One-time codes
// ---------------------------------------------------------------------------

export function otpEmail(code: string, minutes: number): EmailContent {
  const spaced = code.split("").join(" ");

  return {
    subject: `${code} is your FindMyTeammate verification code`,
    text: textLayout(
      [
        `Your verification code is ${code}`,
        "",
        `Enter it on the sign-up screen to confirm your Amrita email address. It expires in ${minutes} minutes and can only be used once.`,
        "",
        "If you did not request this code, you can ignore this email. Someone may have mistyped their address, and no account can be created without the code.",
        "",
        "Never share this code with anyone. FindMyTeammate will never ask you for it.",
      ],
      "You received this because someone entered this address when signing up for FindMyTeammate.",
    ),
    html: layout({
      preheader: `Your code is ${code}. It expires in ${minutes} minutes.`,
      heading: "Confirm your email address",
      bodyHtml: [
        paragraph(
          "Enter this code on the sign-up screen to confirm your Amrita email address.",
        ),
        `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px">
          <tr><td style="background-color:#f5f6f8;border:1px solid ${LINE};border-radius:6px;padding:16px 22px">
            <span style="font-size:30px;font-weight:700;letter-spacing:6px;color:${BRAND};font-family:'SF Mono',Menlo,Consolas,monospace" aria-label="${spaced}">${code}</span>
          </td></tr>
        </table>`,
        `<p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:${MUTED}">It expires in ${minutes} minutes and can only be used once.</p>`,
        `<p style="margin:0;padding-top:16px;border-top:1px solid ${LINE};font-size:13px;line-height:1.6;color:${MUTED}">Never share this code. FindMyTeammate will never ask you for it. If you did not request it, no account can be created without it, so you can ignore this email.</p>`,
      ].join("\n"),
      footerNote:
        "You received this because someone entered this address when signing up for FindMyTeammate.",
    }),
  };
}

// ---------------------------------------------------------------------------
// Notifications (invites, requests, verification results)
// ---------------------------------------------------------------------------

export function notificationEmail({
  firstName,
  heading,
  body,
  href,
  ctaLabel,
}: {
  firstName: string;
  heading: string;
  body?: string;
  href?: string;
  ctaLabel?: string;
}): EmailContent {
  const base = appUrl();
  const link = href ? `${base}${href}` : undefined;

  return {
    subject: heading,
    text: textLayout(
      [
        `Hi ${firstName},`,
        "",
        body ?? heading,
        ...(link ? ["", link] : []),
      ],
      "You received this because of your notification settings on FindMyTeammate. Change them at " +
        `${base}/settings`,
    ),
    html: layout({
      preheader: body ?? heading,
      heading,
      bodyHtml: [
        paragraph(`Hi ${firstName},`),
        body ? paragraph(body) : "",
      ]
        .filter(Boolean)
        .join("\n"),
      cta: link && ctaLabel ? { label: ctaLabel, href: link } : undefined,
      footerNote:
        "You received this because of your notification settings. You can change them in Settings.",
    }),
  };
}

// ---------------------------------------------------------------------------
// Weekly digest
// ---------------------------------------------------------------------------

export function digestEmail({
  firstName,
  teamName,
  eventName,
  teamId,
  groups,
}: {
  firstName: string;
  teamName: string;
  eventName: string;
  teamId: string;
  groups: Array<{
    roleName: string;
    candidates: Array<{ name: string; score: number; reason?: string }>;
  }>;
}): EmailContent {
  const base = appUrl();
  const link = `${base}/team-builder?team=${teamId}`;
  const total = groups.reduce((n, g) => n + g.candidates.length, 0);

  const textLines = [
    `Hi ${firstName},`,
    "",
    `${teamName} still has open roles for ${eventName}. These people match them best this week:`,
    "",
    ...groups.flatMap((g) => [
      `${g.roleName}`,
      ...g.candidates.map(
        (c) => `  - ${c.name} (${c.score}% match)${c.reason ? ` — ${c.reason}` : ""}`,
      ),
      "",
    ]),
    link,
  ];

  const htmlGroups = groups
    .map(
      (g) => `
      <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:${INK}">${escapeHtml(g.roleName)}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px">
        ${g.candidates
          .map(
            (c) => `<tr>
          <td style="padding:6px 0;border-bottom:1px solid ${LINE};font-size:14px;color:${INK}">${escapeHtml(c.name)}${
            c.reason
              ? `<span style="display:block;font-size:12px;color:${MUTED}">${escapeHtml(c.reason)}</span>`
              : ""
          }</td>
          <td align="right" style="padding:6px 0;border-bottom:1px solid ${LINE};font-size:14px;font-weight:600;color:${MUTED};white-space:nowrap">${c.score}%</td>
        </tr>`,
          )
          .join("")}
      </table>`,
    )
    .join("");

  return {
    subject: `${total} ${total === 1 ? "person matches" : "people match"} your open roles on ${teamName}`,
    text: textLayout(
      textLines,
      `You received this because the weekly digest is on for your account. Turn it off at ${base}/settings`,
    ),
    html: layout({
      preheader: `${total} ranked ${total === 1 ? "candidate" : "candidates"} for the open roles on ${teamName}.`,
      heading: `Candidates for ${teamName}`,
      bodyHtml: [
        paragraph(`Hi ${firstName},`),
        paragraph(
          `${teamName} still has open roles for ${eventName}. These people match them best this week.`,
        ),
        htmlGroups,
      ].join("\n"),
      cta: { label: "Review and invite", href: link },
      footerNote:
        "You received this because the weekly digest is on for your account. You can turn it off in Settings.",
    }),
  };
}
