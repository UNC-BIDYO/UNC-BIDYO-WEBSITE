/**
 * Cloudflare Turnstile: a free, mostly invisible bot check for the public booking form.
 * Active only when TURNSTILE_SECRET_KEY is set (the form shows the widget when
 * VITE_TURNSTILE_SITE_KEY is set); until then every request passes as before.
 */
import { env } from "./env.js";

export type HumanCheck = "skipped" | "ok" | "missing" | "failed";

/** The visitor's IP as seen by Vercel, passed to Cloudflare as a hint. */
export const clientIp = (request: Request) =>
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;

export async function verifyHuman(token: string, ip?: string): Promise<HumanCheck> {
  const secret = env("TURNSTILE_SECRET_KEY");
  if (!secret) return "skipped";
  if (!token) return "missing";
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, ...(ip ? { remoteip: ip } : {}) }),
    });
    const body = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (body.success) return "ok";
    console.warn(`turnstile: rejected (${(body["error-codes"] ?? []).join(", ") || res.status})`);
    return "failed";
  } catch (e) {
    // Fail closed: an unverifiable request could be a bot. The form tells people to email instead.
    console.error("turnstile: verification request failed:", (e as Error).message);
    return "failed";
  }
}
