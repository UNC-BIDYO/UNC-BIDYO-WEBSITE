/** GET/PUT /api/admin/settings: { overlapCheck } (admin only). */
import { json, requireAdmin } from "../_lib/admin.js";
import { getSetting, setSetting } from "../_lib/supabase.js";

const SCOPE = "admin/settings";

export async function GET(request: Request): Promise<Response> {
  const admin = await requireAdmin(request, SCOPE);
  if (admin instanceof Response) return admin;
  try {
    return json(200, {
      overlapCheck: (await getSetting(admin.db, "overlap_check", false)) === true,
    });
  } catch (e) {
    console.error(`${SCOPE}: read failed:`, (e as Error).message);
    return json(502, { error: "Couldn't load settings." });
  }
}

export async function PUT(request: Request): Promise<Response> {
  const admin = await requireAdmin(request, SCOPE);
  if (admin instanceof Response) return admin;
  const body = (await request.json().catch(() => null)) as { overlapCheck?: unknown } | null;
  if (typeof body?.overlapCheck !== "boolean") {
    return json(400, { error: "Send { overlapCheck: true | false }." });
  }
  try {
    await setSetting(admin.db, "overlap_check", body.overlapCheck);
    console.info(`${SCOPE}: overlap_check set to ${body.overlapCheck} by ${admin.email}`);
    return json(200, { overlapCheck: body.overlapCheck });
  } catch (e) {
    console.error(`${SCOPE}: save failed:`, (e as Error).message);
    return json(502, { error: "Couldn't save the setting." });
  }
}
