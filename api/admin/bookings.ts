/** GET /api/admin/bookings: every booking, newest first (admin only). */
import { json, requireAdmin } from "../_lib/admin.js";
import { listBookings } from "../_lib/supabase.js";

export async function GET(request: Request): Promise<Response> {
  const admin = await requireAdmin(request, "admin/bookings");
  if (admin instanceof Response) return admin;
  try {
    return json(200, { bookings: await listBookings(admin.db) });
  } catch (e) {
    console.error("admin/bookings: listing failed:", (e as Error).message);
    return json(502, { error: "Couldn't load bookings. Try again." });
  }
}
