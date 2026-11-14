/** Supabase REST and Storage calls, made with the server-only service-role key. */
import type { Booking, Fields } from "./booking.js";
import { env, envState } from "./env.js";

export type SupabaseConfig = { url: string; key: string };

/** The project URL and key, or null (logging which variable is missing) if either is unset. */
export function supabaseConfig(scope: string): SupabaseConfig | null {
  const url = env("SUPABASE_URL").replace(/\/+$/, "");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (url && key) return { url, key };
  console.error(
    `${scope}: Supabase settings unavailable (VERCEL_ENV=${process.env.VERCEL_ENV ?? "?"}): ` +
      `SUPABASE_URL ${envState("SUPABASE_URL")}, SUPABASE_SERVICE_ROLE_KEY ${envState("SUPABASE_SERVICE_ROLE_KEY")}. ` +
      `Check Vercel → Settings → Environment Variables for this environment, then redeploy.`,
  );
  return null;
}

/** Secret keys (sb_secret_…) go in `apikey` only; legacy service-role JWTs also as a Bearer token. */
function supabaseHeaders(key: string): Record<string, string> {
  return key.startsWith("eyJ") ? { apikey: key, Authorization: `Bearer ${key}` } : { apikey: key };
}

/** Uploads a file to the private "letters" bucket. */
export async function uploadLetter(
  { url, key }: SupabaseConfig,
  path: string,
  type: string,
  bytes: ArrayBuffer,
) {
  const res = await fetch(`${url}/storage/v1/object/letters/${path}`, {
    method: "POST",
    headers: { ...supabaseHeaders(key), "Content-Type": type, "x-upsert": "false" },
    body: bytes,
  });
  if (!res.ok) throw new Error(`storage upload ${res.status}: ${await res.text()}`);
}

/** Saves a booking and returns the stored row (with its id, the reference number). */
export async function insertBooking(
  { url, key }: SupabaseConfig,
  row: Fields & { letter_path: string | null } & Record<string, unknown>,
): Promise<Booking> {
  const res = await fetch(`${url}/rest/v1/bookings`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(key),
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`insert ${res.status}: ${await res.text()}`);
  const [saved] = (await res.json()) as Booking[];
  return saved;
}

const rest = ({ url }: SupabaseConfig, path: string) => `${url}/rest/v1/${path}`;

async function expectOk(res: Response, what: string) {
  if (!res.ok) throw new Error(`${what} ${res.status}: ${await res.text()}`);
  return res;
}

/** All bookings, newest first (the admin panel works from this one list). */
export async function listBookings(db: SupabaseConfig, limit = 1000): Promise<Booking[]> {
  const res = await fetch(rest(db, `bookings?select=*&order=created_at.desc&limit=${limit}`), {
    headers: supabaseHeaders(db.key),
  });
  return (await (await expectOk(res, "list bookings")).json()) as Booking[];
}

export async function getBooking(db: SupabaseConfig, id: string): Promise<Booking | null> {
  const res = await fetch(rest(db, `bookings?id=eq.${encodeURIComponent(id)}&select=*`), {
    headers: supabaseHeaders(db.key),
  });
  const [row] = (await (await expectOk(res, "get booking")).json()) as Booking[];
  return row ?? null;
}

/** Updates a booking. With `onlyIfStatus`, nothing changes (and null is returned) unless the
    booking still has that status, so two admins can't decide the same request twice. */
export async function updateBooking(
  db: SupabaseConfig,
  id: string,
  patch: Partial<Booking>,
  onlyIfStatus?: string,
): Promise<Booking | null> {
  const filter = `id=eq.${encodeURIComponent(id)}${onlyIfStatus ? `&status=eq.${onlyIfStatus}` : ""}`;
  const res = await fetch(rest(db, `bookings?${filter}`), {
    method: "PATCH",
    headers: {
      ...supabaseHeaders(db.key),
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(patch),
  });
  const [row] = (await (await expectOk(res, "update booking")).json()) as Booking[];
  return row ?? null;
}

/** A setting's JSON value, or `fallback` when it isn't set. */
export async function getSetting<T>(db: SupabaseConfig, key: string, fallback: T): Promise<T> {
  const res = await fetch(rest(db, `settings?key=eq.${encodeURIComponent(key)}&select=value`), {
    headers: supabaseHeaders(db.key),
  });
  const [row] = (await (await expectOk(res, "get setting")).json()) as { value: T }[];
  return row ? row.value : fallback;
}

export async function setSetting(db: SupabaseConfig, key: string, value: unknown) {
  const res = await fetch(rest(db, "settings?on_conflict=key"), {
    method: "POST",
    headers: {
      ...supabaseHeaders(db.key),
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
  });
  await expectOk(res, "set setting");
}

/** A temporary download link for a file in the private "letters" bucket. */
export async function signLetterUrl(db: SupabaseConfig, path: string, expiresIn = 600) {
  const res = await fetch(`${db.url}/storage/v1/object/sign/letters/${path}`, {
    method: "POST",
    headers: { ...supabaseHeaders(db.key), "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn }),
  });
  const body = (await (await expectOk(res, "sign letter")).json()) as { signedURL: string };
  return `${db.url}/storage/v1${body.signedURL}`;
}

/** The signed-in user's email for an access token, or null if the token isn't valid. */
export async function userEmailForToken(db: SupabaseConfig, token: string): Promise<string | null> {
  const res = await fetch(`${db.url}/auth/v1/user`, {
    headers: { apikey: db.key, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const user = (await res.json()) as { email?: string };
  return user.email?.toLowerCase() ?? null;
}

/** How many bookings this email address submitted since `sinceIso` (for the per-address limit). */
export async function countRecentBookings(
  db: SupabaseConfig,
  email: string,
  sinceIso: string,
): Promise<number> {
  const q = `bookings?select=id&email=eq.${encodeURIComponent(email)}&created_at=gte.${encodeURIComponent(sinceIso)}&limit=20`;
  const res = await fetch(rest(db, q), { headers: supabaseHeaders(db.key) });
  return ((await (await expectOk(res, "count bookings")).json()) as unknown[]).length;
}
