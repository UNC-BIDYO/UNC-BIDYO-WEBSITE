/**
 * Booking emails: one responsive, inline-styled template (tables, no external CSS, so Gmail,
 * Outlook and phone apps render it the same), in five variants, plus sending through Resend.
 */
import { formatDates, fullName, type Booking } from "./booking.js";
import { env, siteUrl } from "./env.js";

/* Kept in sync with src/shared/lib/site.ts (functions don't import from the site bundle). */
const CONTACT_EMAIL = "uncbidyoorg@gmail.com";
const FACEBOOK_URL = "https://www.facebook.com/UNCBidyo";

export type EmailKind = "received" | "received-copy" | "approved" | "declined" | "unavailable";

export type RenderedEmail = { subject: string; html: string; text: string };

type Pill = { label: string; bg: string; fg: string };
const PILLS = {
  pending: { label: "Pending review", bg: "#fff4e0", fg: "#7a4b00" },
  approved: { label: "Approved", bg: "#e6f4ea", fg: "#1d5c34" },
  declined: { label: "Not approved", bg: "#fbe9e9", fg: "#6c0204" },
  unavailable: { label: "Date unavailable", bg: "#fbe9e9", fg: "#6c0204" },
} satisfies Record<string, Pill>;

type Variant = {
  subject: string;
  title: string;
  greeting: string;
  intro: string[];
  pill: Pill;
  detailsHeading: string;
  showContact: boolean;
  button?: { label: string; href: string };
  bullets: string[];
  footer: string;
};

const ONE_WAY = "This is a one-way notification. Replies to this address are not monitored.";

function variant(kind: EmailKind, b: Booking): Variant {
  const event = b.event_title;
  const site = siteUrl();
  switch (kind) {
    case "received":
      return {
        subject: `We received your booking request: ${event}`,
        title: "Booking Request Received",
        greeting: `Dear ${b.first_name},`,
        intro: [
          "Thank you for booking with UNC Bidyo! We've received your request, and our team will review it shortly.",
        ],
        pill: PILLS.pending,
        detailsHeading: "Your request details:",
        showContact: false,
        bullets: [
          "This is not a confirmation yet. We'll email you again once your booking is approved, or if we need more details.",
          "Keep your reference number for any follow-up.",
          "No need to send another request for the same event.",
        ],
        footer: ONE_WAY,
      };
    case "received-copy":
      return {
        subject: `New booking: ${event} (${formatDates(b)})`,
        title: "New Booking Request",
        greeting: "Hi Bidyo team,",
        intro: [
          `${fullName(b)} submitted a booking request on the website. Reply to this email to answer them directly.`,
        ],
        pill: PILLS.pending,
        detailsHeading: "Request details:",
        showContact: true,
        bullets: [
          "The booking is saved in Supabase (table “bookings”) with status “pending”.",
          "The requester got a copy of these details, marked “pending review”.",
        ],
        footer: `Sent by the booking form on ${site.replace(/^https?:\/\//, "")}.`,
      };
    case "approved":
      return {
        subject: `Your booking is confirmed: ${event}`,
        title: "Booking Confirmed",
        greeting: `Dear ${b.first_name},`,
        intro: [
          "Great news! Your booking request has been approved, and UNC Bidyo will cover your event.",
        ],
        pill: PILLS.approved,
        detailsHeading: "Your booking:",
        showContact: false,
        bullets: [
          "Our team will reach out to coordinate the final details, such as call time, shot list and contact person.",
          "If your event details change, contact us as soon as possible.",
          "Keep your reference number for any follow-up.",
        ],
        footer: ONE_WAY,
      };
    case "declined":
      return {
        subject: `Update on your booking request: ${event}`,
        title: "Booking Not Approved",
        greeting: `Dear ${b.first_name},`,
        intro: [
          "Thank you for considering UNC Bidyo. Unfortunately, we can't accept this booking request.",
        ],
        pill: PILLS.declined,
        detailsHeading: "Your request:",
        showContact: false,
        button: { label: "Send a new request", href: `${site}/#book` },
        bullets: [
          "You're welcome to send a new request for a different date or event.",
          "Questions about this decision? Contact us at the address below.",
        ],
        footer: ONE_WAY,
      };
    case "unavailable":
      return {
        subject: `Date unavailable: ${event}`,
        title: "Date Unavailable",
        greeting: `Dear ${b.first_name},`,
        intro: [
          "Thank you for your request. Unfortunately, UNC Bidyo is already scheduled to cover another event on the date you asked for, so we can't take this booking.",
          "Please choose a different date and send a new request.",
        ],
        pill: PILLS.unavailable,
        detailsHeading: "Your request:",
        showContact: false,
        button: { label: "Choose another date", href: `${site}/#schedule` },
        bullets: [
          "Our schedule on the website shows which days are already booked.",
          "This request is closed; you don't need to do anything else for it.",
        ],
        footer: ONE_WAY,
      };
  }
}

export const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

function detailRows(b: Booking, showContact: boolean, letterName: string | null) {
  const rows: [string, string][] = [
    ["Event", b.event_title],
    ["Service", b.service],
    ["Organization", b.organization],
    [b.end_date ? "Dates" : "Date", formatDates(b)],
    ["Place", b.venue],
    ["Shooters", String(b.shooters)],
  ];
  if (showContact) {
    rows.unshift(["Name", fullName(b)], ["Email", b.email], ["Mobile", b.mobile]);
  }
  if (letterName)
    rows.push(["Formal letter", showContact ? `${letterName} (attached)` : "Received"]);
  rows.push(["Reference #", b.id]);
  return rows;
}

const FONT = "font-family:Arial,Helvetica,sans-serif;";

/** Renders one of the booking emails. `reason` is shown for "declined". */
export function renderBookingEmail(
  kind: EmailKind,
  b: Booking,
  opts: { reason?: string; letterName?: string | null } = {},
): RenderedEmail {
  const v = variant(kind, b);
  const rows = detailRows(b, v.showContact, opts.letterName ?? null);
  const site = siteUrl();
  const year = new Date().getFullYear();
  const e = escapeHtml;

  const rowsHtml = rows
    .map(
      ([label, value], i) =>
        `<tr><td style="${FONT}padding:10px 0;${i ? "border-top:1px solid #ececea;" : ""}font-size:14px;color:#55555a;vertical-align:top;white-space:nowrap;">${e(label)}</td>` +
        `<td style="${FONT}padding:10px 0 10px 16px;${i ? "border-top:1px solid #ececea;" : ""}font-size:14px;color:#0b0b0c;text-align:right;vertical-align:top;word-break:break-word;">${e(value)}</td></tr>`,
    )
    .join("");

  const requestsHtml = b.requests
    ? `<p style="${FONT}margin:16px 0 0;font-size:14px;color:#55555a;">Additional requests</p>
       <p style="${FONT}margin:4px 0 0;font-size:14px;line-height:1.5;color:#0b0b0c;white-space:pre-wrap;">${e(b.requests)}</p>`
    : "";

  const reasonHtml =
    kind === "declined" && opts.reason
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr>
           <td style="${FONT}border-left:4px solid #6c0204;background:#f7f7f5;padding:12px 16px;font-size:14px;line-height:1.5;color:#0b0b0c;">
             <strong>Reason:</strong> ${e(opts.reason)}</td></tr></table>`
      : "";

  const buttonHtml = v.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:8px auto 28px;"><tr>
         <td style="background:#0b0b0c;">
           <a href="${e(v.button.href)}" style="${FONT}display:inline-block;padding:14px 28px;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;letter-spacing:0.04em;">${e(v.button.label)}</a>
         </td></tr></table>`
    : "";

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${e(v.title)}</title>
<style>@media (max-width:620px){.card{padding:24px 20px!important}}</style>
</head>
<body style="margin:0;padding:0;background:#f4f4f2;">
<div style="display:none;max-height:0;overflow:hidden;">${e(v.intro[0])}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f2;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-top:4px solid #6c0204;">
<tr><td class="card" style="padding:32px 36px;">

  <img src="${site}/email/bidyo-logo.png" width="120" alt="UNC Bidyo" style="display:block;border:0;height:auto;margin:0 0 20px;">
  <h1 style="${FONT}margin:0;font-size:22px;line-height:1.3;color:#0b0b0c;">${e(v.title)}</h1>
  <p style="${FONT}margin:6px 0 24px;font-size:14px;color:#55555a;">UNC Bidyo &middot; Photo &amp; Video Coverage</p>

  <p style="${FONT}margin:0 0 12px;font-size:15px;color:#0b0b0c;">${e(v.greeting)}</p>
  ${v.intro.map((p) => `<p style="${FONT}margin:0 0 16px;font-size:15px;line-height:1.55;color:#0b0b0c;">${e(p)}</p>`).join("")}

  <p style="margin:4px 0 24px;"><span style="${FONT}display:inline-block;padding:6px 12px;background:${v.pill.bg};color:${v.pill.fg};font-size:12px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;">${e(v.pill.label)}</span></p>

  ${reasonHtml}
  ${buttonHtml}

  <p style="${FONT}margin:0 0 4px;font-size:14px;font-weight:bold;color:#0b0b0c;">${e(v.detailsHeading)}</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowsHtml}</table>
  ${requestsHtml}

  <p style="${FONT}margin:28px 0 8px;font-size:14px;font-weight:bold;color:#0b0b0c;letter-spacing:0.04em;">IMPORTANT INFORMATION:</p>
  <ul style="${FONT}margin:0 0 24px;padding-left:20px;font-size:14px;line-height:1.6;color:#0b0b0c;">
    ${v.bullets.map((x) => `<li style="margin:0 0 4px;">${e(x)}</li>`).join("")}
  </ul>

  <p style="${FONT}margin:0 0 24px;font-size:14px;line-height:1.6;color:#0b0b0c;">If you have any questions, contact us at <a href="mailto:${CONTACT_EMAIL}" style="color:#6c0204;">${CONTACT_EMAIL}</a> or message us on <a href="${FACEBOOK_URL}" style="color:#6c0204;">Facebook</a>.</p>

  <p style="${FONT}margin:0;font-size:14px;line-height:1.6;color:#0b0b0c;">Warm regards,<br>UNC Bidyo</p>

  <hr style="border:0;border-top:1px solid #ececea;margin:28px 0 16px;">
  <p style="${FONT}margin:0;font-size:12px;line-height:1.5;color:#77777c;">&copy; ${year} UNC Bidyo. ${e(v.footer)}</p>

</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    v.title,
    "UNC Bidyo · Photo & Video Coverage",
    "",
    v.greeting,
    "",
    ...v.intro.flatMap((p) => [p, ""]),
    `Status: ${v.pill.label}`,
    ...(kind === "declined" && opts.reason ? ["", `Reason: ${opts.reason}`] : []),
    ...(v.button ? ["", `${v.button.label}: ${v.button.href}`] : []),
    "",
    v.detailsHeading,
    ...rows.map(([l, val]) => `  ${l}: ${val}`),
    ...(b.requests ? ["", "Additional requests:", b.requests] : []),
    "",
    "IMPORTANT INFORMATION:",
    ...v.bullets.map((x) => `  - ${x}`),
    "",
    `Questions? Email ${CONTACT_EMAIL} or message us on Facebook: ${FACEBOOK_URL}`,
    "",
    "Warm regards,",
    "UNC Bidyo",
    "",
    `© ${year} UNC Bidyo. ${v.footer}`,
  ].join("\n");

  return { subject: v.subject, html, text };
}

/** Resend refuses to deliver from its shared test domain to anyone but the account owner. */
export const canEmailCustomers = () => !/resend\.dev/i.test(env("BOOKING_FROM"));

/** Sends an email through Resend. Returns false (and logs why) instead of throwing. */
export async function sendEmail(
  scope: string,
  msg: RenderedEmail & {
    to: string[];
    replyTo?: string;
    attachments?: { filename: string; content: string }[];
  },
): Promise<boolean> {
  const key = env("RESEND_API_KEY");
  if (!key || msg.to.length === 0) {
    console.warn(`${scope}: RESEND_API_KEY or recipient missing; "${msg.subject}" not sent`);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env("BOOKING_FROM") || "UNC Bidyo <onboarding@resend.dev>",
        to: msg.to,
        reply_to: msg.replyTo,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        attachments: msg.attachments,
      }),
    });
    if (!res.ok) {
      console.error(`${scope}: email "${msg.subject}" failed: ${res.status} ${await res.text()}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`${scope}: email "${msg.subject}" failed`, e);
    return false;
  }
}

/** Bidyo's own inbox(es) from BOOKING_NOTIFY_TO, comma-separated. */
export const notifyAddresses = () =>
  env("BOOKING_NOTIFY_TO")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
