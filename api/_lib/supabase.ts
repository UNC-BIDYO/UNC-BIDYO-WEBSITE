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
export function supabaseHeaders(key: string): Record<string, string> {
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
