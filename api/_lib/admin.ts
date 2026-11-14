/** Shared pieces of the admin API (/api/admin/*): sign-in check and the Google Calendar sync. */
import { addDays, googleConfig, insertEvent } from "./google.js";
import { formatCrew, formatDates, formatServices, fullName, type Booking } from "./booking.js";
import { env } from "./env.js";
import { CONTACT_EMAIL } from "./site.js";
import {
  supabaseConfig,
  updateBooking,
  userEmailForToken,
  type SupabaseConfig,
} from "./supabase.js";

export const json = (status: number, body: unknown) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** Admin emails from ADMIN_EMAILS (comma-separated); defaults to Bidyo's own account. */
const adminEmails = () =>
  (env("ADMIN_EMAILS") || CONTACT_EMAIL)
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

export type AdminContext = { db: SupabaseConfig; email: string };

/**
 * Checks the request's `Authorization: Bearer <Supabase access token>`.
 * Returns the context, or a ready-made error Response (401 not signed in, 403 not an admin,
 * 503 not configured).
 */
export async function requireAdmin(
  request: Request,
  scope: string,
): Promise<AdminContext | Response> {
  const db = supabaseConfig(scope);
  if (!db) return json(503, { error: "The admin panel isn't configured yet." });
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return json(401, { error: "Please sign in." });
  const email = await userEmailForToken(db, token);
  if (!email) return json(401, { error: "Your session has expired. Please sign in again." });
  if (!adminEmails().includes(email)) {
    console.warn(`${scope}: ${email} is signed in but not in ADMIN_EMAILS`);
    return json(403, { error: "This account isn't an admin." });
  }
  return { db, email };
}

/**
 * Creates the Google Calendar event for an approved booking and records the result on the
 * booking. Safe to repeat: does nothing if the booking already has an event.
 */
export async function syncToCalendar(
  db: SupabaseConfig,
  booking: Booking,
  scope: string,
): Promise<{ booking: Booking; synced: boolean; error?: string }> {
  if (booking.calendar_event_id) return { booking, synced: true };
  const google = googleConfig(scope);
  let error: string;
  if (!google) {
    error = "Google Calendar isn't configured (see supabase/README.md).";
  } else {
    try {
      const event = await insertEvent(google, {
        summary: `[Bidyo] ${booking.event_title} (${booking.organization})`,
        location: booking.venue,
        description: [
          `Booked through uncbidyo.org: ${formatServices(booking)}.`,
          `Crew: ${formatCrew(booking)}`,
          `Dates: ${formatDates(booking)}`,
          `Contact: ${fullName(booking)}, ${booking.email}, ${booking.mobile}`,
          booking.requests ? `Requests: ${booking.requests}` : "",
          `Reference #: ${booking.id}`,
        ]
          .filter(Boolean)
          .join("\n"),
        // All-day event; Google's end date is exclusive.
        start: { date: booking.start_date },
        end: { date: addDays(booking.end_date ?? booking.start_date, 1) },
        transparency: "opaque",
        extendedProperties: { private: { bookingId: booking.id } },
      });
      const saved = await updateBooking(db, booking.id, {
        calendar_event_id: event.id,
        calendar_sync_error: null,
      });
      return { booking: saved ?? booking, synced: true };
    } catch (e) {
      error = (e as Error).message;
    }
  }
  console.error(`${scope}: calendar sync failed for ${booking.id}: ${error}`);
  const saved = await updateBooking(db, booking.id, { calendar_sync_error: error }).catch(
    () => null,
  );
  return { booking: saved ?? { ...booking, calendar_sync_error: error }, synced: false, error };
}
