/**
 * POST /api/book: receives the booking form (multipart/form-data), validates it, stores the
 * formal letter in Supabase Storage, saves the booking in Supabase Postgres, and emails it to
 * Bidyo through Resend. Setup steps: supabase/README.md.
 *
 * Environment variables (Vercel → Settings → Environment Variables):
 *   SUPABASE_URL               https://<project>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY  server-only key (bypasses Row Level Security; never ship to the browser)
 *   RESEND_API_KEY             re_...
 *   BOOKING_NOTIFY_TO          inbox that receives bookings, e.g. uncbidyoorg@gmail.com
 *   BOOKING_FROM               sender, e.g. "UNC Bidyo <onboarding@resend.dev>"
 *
 * This file imports nothing on purpose: Vercel runs it as an ES module, where imports of other
 * local TypeScript files are fragile. The form imports BOOKING_RULES from here instead, so the
 * browser and the server check the same limits.
 */

export const BOOKING_RULES = {
  maxLength: {
    name: 100,
    email: 254,
    mobile: 20,
    organization: 150,
    event_title: 150,
    service: 60,
    venue: 200,
    requests: 2000,
  },
  /** Philippine mobile: 09XX XXX XXXX or +63 9XX XXX XXXX, spaces/dashes allowed. Also used as
      the input's HTML `pattern`, which browsers compile with the `v` flag, so `-` is escaped. */
  mobilePattern: "(\\+63|0)[\\s\\-]?9\\d{2}[\\s\\-]?\\d{3}[\\s\\-]?\\d{4}",
  shooters: { min: 1, max: 10 },
  /** Vercel rejects requests over 4.5 MB, so the letter stays under that with the other fields. */
  letterMaxBytes: 4 * 1024 * 1024,
  letterTypes: {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
  } as Record<string, string>,
} as const;

type Fields = {
  name: string;
  email: string;
  mobile: string;
  organization: string;
  event_title: string;
  service: string;
  start_date: string;
  end_date: string | null;
  venue: string;
  shooters: number;
  requests: string | null;
};
type Errors = Partial<Record<keyof Fields | "letter", string>>;
type Letter = { name: string; type: string; file: Blob };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Today's date in the Philippines (YYYY-MM-DD); the server itself runs in UTC. */
const todayInManila = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());

const text = (form: FormData, key: string) => {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
};

export function validate(
  form: FormData,
): { fields: Fields; letter: Letter | null; errors: Errors } | { errors: Errors } {
  const errors: Errors = {};
  const max = BOOKING_RULES.maxLength;
  const required = (key: keyof typeof max, missing: string) => {
    const v = text(form, key);
    if (!v) errors[key] = missing;
    else if (v.length > max[key]) errors[key] = `Keep this under ${max[key]} characters.`;
    return v;
  };

  const name = required("name", "Enter your name.");
  const email = required("email", "Enter your email address.");
  if (email && !errors.email && !EMAIL.test(email)) errors.email = "Enter a valid email address.";
  const mobile = required("mobile", "Enter a mobile number.");
  if (mobile && !errors.mobile && !new RegExp(`^${BOOKING_RULES.mobilePattern}$`).test(mobile)) {
    errors.mobile = "Enter a Philippine mobile number, like 0917 123 4567.";
  }
  const organization = required("organization", "Enter your organization.");
  const event_title = required("event_title", "Enter the activity or event title.");
  const service = required("service", "Choose a service.");
  const venue = required("venue", "Enter the event place.");

  const today = todayInManila();
  const start_date = text(form, "start_date");
  if (!DATE.test(start_date)) errors.start_date = "Choose the event date.";
  else if (start_date < today) errors.start_date = "Choose a date from today onward.";

  let end_date: string | null = null;
  if (text(form, "multiday")) {
    end_date = text(form, "end_date");
    if (!DATE.test(end_date)) errors.end_date = "Choose the last day of the event.";
    else if (DATE.test(start_date) && end_date <= start_date) {
      errors.end_date = "The last day must be after the first day.";
    }
  }

  const shootersRaw = text(form, "shooters");
  const shooters = Number(shootersRaw);
  const { min, max: most } = BOOKING_RULES.shooters;
  if (!shootersRaw || !Number.isInteger(shooters) || shooters < min || shooters > most) {
    errors.shooters = `Enter a number from ${min} to ${most}.`;
  }

  const requests = text(form, "requests");
  if (requests.length > max.requests)
    errors.requests = `Keep this under ${max.requests} characters.`;

  // An empty file input still sends a nameless, zero-byte file.
  let letter: Letter | null = null;
  const file = form.get("letter");
  if (file && typeof file !== "string" && file.size > 0) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const type = BOOKING_RULES.letterTypes[ext];
    if (!type) errors.letter = "Upload a PDF, Word document, JPG or PNG.";
    else if (file.size > BOOKING_RULES.letterMaxBytes)
      errors.letter = "The letter must be 4 MB or smaller.";
    else letter = { name: file.name, type, file };
  }

  if (Object.keys(errors).length) return { errors };
  return {
    fields: {
      name,
      email,
      mobile,
      organization,
      event_title,
      service,
      start_date,
      end_date,
      venue,
      shooters,
      requests: requests || null,
    },
    letter,
    errors,
  };
}

const env = (key: string) => process.env[key]?.trim() ?? "";

/** Secret keys (sb_secret_…) go in `apikey` only; legacy service-role JWTs also as a Bearer token. */
function supabaseHeaders(key: string): Record<string, string> {
  return key.startsWith("eyJ") ? { apikey: key, Authorization: `Bearer ${key}` } : { apikey: key };
}

const safeFileName = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(-80) || "letter";

function bytesToBase64(bytes: ArrayBuffer) {
  return Buffer.from(bytes).toString("base64");
}

const formatDates = (f: Fields) => (f.end_date ? `${f.start_date} to ${f.end_date}` : f.start_date);

function emailBody(f: Fields, letterName: string | null) {
  return [
    `New booking request from the website`,
    ``,
    `Name:          ${f.name}`,
    `Email:         ${f.email}`,
    `Mobile:        ${f.mobile}`,
    `Organization:  ${f.organization}`,
    `Event:         ${f.event_title}`,
    `Service:       ${f.service}`,
    `Date:          ${formatDates(f)}`,
    `Place:         ${f.venue}`,
    `Shooters:      ${f.shooters}`,
    `Formal letter: ${letterName ? `${letterName} (attached)` : "none"}`,
    ``,
    `Additional requests:`,
    f.requests ?? "(none)",
    ``,
    `Reply to this email to answer ${f.name} directly. The booking is also saved in Supabase (table "bookings").`,
  ].join("\n");
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Page shown after a plain (no-JavaScript) form post. */
function resultPage(status: number, title: string, lines: string[]) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escapeHtml(title)} | UNC Bidyo</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0b0c;color:#fff;font:18px/1.6 system-ui,sans-serif}main{max-width:36rem;padding:2rem 1.25rem}h1{font:700 2.5rem/1 Impact,"Arial Narrow Bold",sans-serif;text-transform:uppercase;margin:0 0 1rem}ul{padding-left:1.2rem;color:#ec6266}a{color:#fff;text-decoration-color:#ec6266;text-underline-offset:4px}</style></head><body><main><h1>${escapeHtml(title)}</h1>${lines.length > 1 ? `<ul>${lines.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>` : `<p>${escapeHtml(lines[0] ?? "")}</p>`}<p><a href="/#book">Back to UNC Bidyo</a></p></main></body></html>`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function POST(request: Request): Promise<Response> {
  const wantsJson = (request.headers.get("accept") ?? "").includes("application/json");
  const reply = (status: number, body: { ok: boolean; errors?: Errors; message?: string }) => {
    if (wantsJson) return Response.json(body, { status });
    if (body.ok)
      return resultPage(200, "Request sent", [
        "Thanks! We got your booking request and will reply by email.",
      ]);
    const lines = body.errors
      ? Object.values(body.errors)
      : [body.message ?? "Something went wrong."];
    return resultPage(status, "Please check your request", lines as string[]);
  };

  const url = env("SUPABASE_URL").replace(/\/+$/, "");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    console.error("book: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set");
    return reply(503, {
      ok: false,
      message: "Booking is temporarily unavailable. Please email uncbidyoorg@gmail.com.",
    });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return reply(400, { ok: false, message: "The form could not be read. Please try again." });
  }

  // Spam trap: people never see this field. Pretend it worked so bots don't adapt.
  if (text(form, "_gotcha")) return reply(200, { ok: true });

  const result = validate(form);
  if (!("fields" in result)) return reply(400, { ok: false, errors: result.errors });
  const { fields } = result;

  try {
    let letter_path: string | null = null;
    let letterBytes: ArrayBuffer | null = null;
    if (result.letter) {
      letterBytes = await result.letter.file.arrayBuffer();
      letter_path = `${todayInManila().slice(0, 7)}/${crypto.randomUUID()}-${safeFileName(result.letter.name)}`;
      const up = await fetch(`${url}/storage/v1/object/letters/${letter_path}`, {
        method: "POST",
        headers: {
          ...supabaseHeaders(key),
          "Content-Type": result.letter.type,
          "x-upsert": "false",
        },
        body: letterBytes,
      });
      if (!up.ok) throw new Error(`storage upload ${up.status}: ${await up.text()}`);
    }

    const insert = await fetch(`${url}/rest/v1/bookings`, {
      method: "POST",
      headers: {
        ...supabaseHeaders(key),
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ ...fields, letter_path }),
    });
    if (!insert.ok) throw new Error(`insert ${insert.status}: ${await insert.text()}`);

    // The booking is saved at this point; a failed email is logged, not shown to the booker.
    const resendKey = env("RESEND_API_KEY");
    const to = env("BOOKING_NOTIFY_TO");
    if (resendKey && to) {
      const mail = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: env("BOOKING_FROM") || "UNC Bidyo <onboarding@resend.dev>",
          to: to.split(",").map((s) => s.trim()),
          reply_to: fields.email,
          subject: `Booking: ${fields.event_title} (${formatDates(fields)})`,
          text: emailBody(fields, result.letter?.name ?? null),
          attachments:
            result.letter && letterBytes
              ? [
                  {
                    filename: safeFileName(result.letter.name),
                    content: bytesToBase64(letterBytes),
                  },
                ]
              : undefined,
        }),
      }).catch((e: unknown) => e);
      if (!(mail instanceof Response) || !mail.ok) {
        console.error(
          "book: notification email failed",
          mail instanceof Response ? `${mail.status} ${await mail.text()}` : mail,
        );
      }
    } else {
      console.warn("book: RESEND_API_KEY or BOOKING_NOTIFY_TO not set; no email sent");
    }

    return reply(200, { ok: true });
  } catch (e) {
    console.error("book: saving failed", e);
    return reply(502, {
      ok: false,
      message: "We couldn't save your request. Please try again, or email uncbidyoorg@gmail.com.",
    });
  }
}
