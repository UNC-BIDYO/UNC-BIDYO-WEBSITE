/**
 * POST /api/book: receives the booking form (multipart/form-data), validates it, stores the
 * formal letter in Supabase Storage, saves the booking in Supabase Postgres, then emails the
 * booker a summary and Bidyo a copy through Resend. Setup steps: supabase/README.md.
 *
 * Environment variables (Vercel → Settings → Environment Variables):
 *   SUPABASE_URL               https://<project>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY  server-only key (bypasses Row Level Security; never ship to the browser)
 *   RESEND_API_KEY             re_...
 *   BOOKING_NOTIFY_TO          inbox that receives bookings, e.g. uncbidyoorg@gmail.com
 *   BOOKING_FROM               sender, e.g. "UNC Bidyo <no-reply@uncbidyo.org>"
 *   SITE_URL                   optional, defaults to https://uncbidyo.org (links/images in emails)
 *
 * Shared code lives in ./_lib (not deployed as routes). Relative imports use ".js", which is
 * what Vercel's ES-module functions need and TypeScript maps back to the .ts files.
 */
import { safeFileName, text, todayInManila, validate, type Errors } from "./_lib/booking.js";
import {
  canEmailCustomers,
  escapeHtml,
  notifyAddresses,
  renderBookingEmail,
  sendEmail,
} from "./_lib/email.js";
import { insertBooking, supabaseConfig, uploadLetter } from "./_lib/supabase.js";

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
        "Thanks! We got your booking request. Check your email for a summary.",
      ]);
    const lines = body.errors
      ? Object.values(body.errors)
      : [body.message ?? "Something went wrong."];
    return resultPage(status, "Please check your request", lines as string[]);
  };

  const db = supabaseConfig("book");
  if (!db) {
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
  const { fields, letter } = result;

  let booking;
  let letterBytes: ArrayBuffer | null = null;
  try {
    let letter_path: string | null = null;
    if (letter) {
      letterBytes = await letter.file.arrayBuffer();
      letter_path = `${todayInManila().slice(0, 7)}/${crypto.randomUUID()}-${safeFileName(letter.name)}`;
      await uploadLetter(db, letter_path, letter.type, letterBytes);
    }
    booking = await insertBooking(db, { ...fields, letter_path });
  } catch (e) {
    console.error("book: saving failed", e);
    return reply(502, {
      ok: false,
      message: "We couldn't save your request. Please try again, or email uncbidyoorg@gmail.com.",
    });
  }

  // The booking is saved at this point; failed emails are logged, not shown to the booker.
  const letterName = letter?.name ?? null;
  const sends: Promise<boolean>[] = [];
  if (canEmailCustomers()) {
    sends.push(
      sendEmail("book", {
        ...renderBookingEmail("received", booking, { letterName }),
        to: [booking.email],
      }),
    );
  } else {
    console.warn(
      "book: BOOKING_FROM uses resend.dev, which can't deliver to customers; summary email skipped",
    );
  }
  sends.push(
    sendEmail("book", {
      ...renderBookingEmail("received-copy", booking, { letterName }),
      to: notifyAddresses(),
      replyTo: booking.email,
      attachments:
        letter && letterBytes
          ? [
              {
                filename: safeFileName(letter.name),
                content: Buffer.from(letterBytes).toString("base64"),
              },
            ]
          : undefined,
    }),
  );
  await Promise.all(sends);

  return reply(200, { ok: true });
}
