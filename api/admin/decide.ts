/**
 * POST /api/admin/decide { id, action, reason? } (admin only)
 *   approve: status → approved, Google Calendar event created, "confirmed" email sent
 *   decline: status → declined with a reason (required), "not approved" email sent
 *   sync:    retries the Google Calendar event for an approved booking
 * Only pending bookings can be approved or declined (409 otherwise), so a request is never
 * decided twice.
 */
import { json, requireAdmin, syncToCalendar } from "../_lib/admin.js";
import { canEmailCustomers, renderBookingEmail, sendEmail } from "../_lib/email.js";
import { getBooking, updateBooking } from "../_lib/supabase.js";

const SCOPE = "admin/decide";
const MAX_REASON = 500;

export async function POST(request: Request): Promise<Response> {
  const admin = await requireAdmin(request, SCOPE);
  if (admin instanceof Response) return admin;
  const { db, email } = admin;

  const body = (await request.json().catch(() => null)) as {
    id?: unknown;
    action?: unknown;
    reason?: unknown;
  } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  const action = body?.action;
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  if (!id || !["approve", "decline", "sync"].includes(action as string)) {
    return json(400, { error: "Send an id and an action (approve, decline or sync)." });
  }
  if (action === "decline" && !reason) return json(400, { error: "Give a reason for declining." });
  if (reason.length > MAX_REASON) {
    return json(400, { error: `Keep the reason under ${MAX_REASON} characters.` });
  }

  try {
    const booking = await getBooking(db, id);
    if (!booking) return json(404, { error: "Booking not found." });

    if (action === "sync") {
      if (booking.status !== "approved") {
        return json(409, { error: "Only approved bookings go on the calendar." });
      }
      const sync = await syncToCalendar(db, booking, SCOPE);
      return json(200, {
        booking: sync.booking,
        calendarSynced: sync.synced,
        calendarError: sync.error,
      });
    }

    if (booking.status !== "pending") {
      return json(409, { error: `This booking was already ${booking.status}.`, booking });
    }

    const decided = await updateBooking(
      db,
      id,
      {
        status: action === "approve" ? "approved" : "declined",
        decided_at: new Date().toISOString(),
        decided_by: email,
        decision_reason: action === "decline" ? reason : null,
      },
      "pending",
    );
    // Someone else decided it between the read and the update.
    if (!decided) return json(409, { error: "This booking was just decided by someone else." });

    let result = decided;
    let calendarSynced: boolean | undefined;
    let calendarError: string | undefined;
    if (action === "approve") {
      const sync = await syncToCalendar(db, decided, SCOPE);
      result = sync.booking;
      calendarSynced = sync.synced;
      calendarError = sync.error;
    }

    let emailed = false;
    if (canEmailCustomers()) {
      emailed = await sendEmail(SCOPE, {
        ...renderBookingEmail(action === "approve" ? "approved" : "declined", result, {
          reason,
          letterName: result.letter_path ? "letter" : null,
        }),
        to: [result.email],
      });
    } else {
      console.warn(`${SCOPE}: BOOKING_FROM uses resend.dev; customer email skipped`);
    }

    return json(200, { booking: result, calendarSynced, calendarError, emailed });
  } catch (e) {
    console.error(`${SCOPE}: failed:`, (e as Error).message);
    return json(502, { error: "Something went wrong. Try again." });
  }
}
