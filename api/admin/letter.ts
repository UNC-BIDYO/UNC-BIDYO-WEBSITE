/** GET /api/admin/letter?id=<booking id>: a 10-minute link to the booking's formal letter. */
import { json, requireAdmin } from "../_lib/admin.js";
import { getBooking, signLetterUrl } from "../_lib/supabase.js";

const SCOPE = "admin/letter";

export async function GET(request: Request): Promise<Response> {
  const admin = await requireAdmin(request, SCOPE);
  if (admin instanceof Response) return admin;
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!id) return json(400, { error: "Send ?id=<booking id>." });
  try {
    const booking = await getBooking(admin.db, id);
    if (!booking) return json(404, { error: "Booking not found." });
    if (!booking.letter_path) return json(404, { error: "This booking has no letter." });
    return json(200, { url: await signLetterUrl(admin.db, booking.letter_path, 600) });
  } catch (e) {
    console.error(`${SCOPE}: failed:`, (e as Error).message);
    return json(502, { error: "Couldn't open the letter." });
  }
}
