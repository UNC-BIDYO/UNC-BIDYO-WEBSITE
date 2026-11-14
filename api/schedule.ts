/**
 * GET /api/schedule: the days Bidyo is already booked, for the public schedule and the booking
 * date picker. Only dates leave the server: no titles, times, places or guests.
 *
 *   200 { booked: ["2026-12-05", ...], from, to, blockBooked }
 *   503 { error }  Google Calendar isn't configured
 *   502 { error }  Google Calendar couldn't be read
 *
 * Cached at Vercel's edge for 15 minutes (and served stale for up to an hour while refreshing),
 * so Google is asked at most a few times an hour however many people visit.
 */
import { todayInManila } from "./_lib/booking.js";
import { addDays, busyDays, googleConfig, listEvents, manilaMidnight } from "./_lib/google.js";
import { getSetting, supabaseConfig } from "./_lib/supabase.js";

/** The admin overlap-check switch: when on, the date picker disables booked days. */
async function blockBookedSetting(): Promise<boolean> {
  const db = supabaseConfig("schedule");
  if (!db) return false;
  try {
    return (await getSetting(db, "overlap_check", false)) === true;
  } catch (e) {
    console.error("schedule: reading overlap_check failed:", (e as Error).message);
    return false;
  }
}

/** How far ahead the schedule looks. */
const DAYS_AHEAD = 183;

export async function GET(): Promise<Response> {
  const noStore = { "Cache-Control": "no-store" };
  const google = googleConfig("schedule");
  if (!google) {
    return Response.json({ error: "Schedule unavailable" }, { status: 503, headers: noStore });
  }

  const from = todayInManila();
  const to = addDays(from, DAYS_AHEAD);
  try {
    const [events, blockBooked] = await Promise.all([
      listEvents(google, manilaMidnight(from), manilaMidnight(addDays(to, 1))),
      blockBookedSetting(),
    ]);
    const booked = busyDays(events).filter((d) => d >= from && d <= to);
    return Response.json(
      { booked, from, to, blockBooked },
      { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" } },
    );
  } catch (e) {
    console.error("schedule: reading Google Calendar failed:", (e as Error).message);
    return Response.json({ error: "Schedule unavailable" }, { status: 502, headers: noStore });
  }
}
