/**
 * Google Calendar access with a service account (server to server: no consent screen, no
 * refresh tokens). The calendar owner shares the calendar with the service account's email
 * ("Make changes to events"). Uses Node's crypto to sign the token request; no Google SDK.
 *
 * Environment variables, either:
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY   (from the JSON key; "\n" escapes are fine)
 * or:
 *   GOOGLE_SERVICE_ACCOUNT_JSON                         (the whole JSON key file)
 * and:
 *   GOOGLE_CALENDAR_ID                                  defaults to uncbidyoorg@gmail.com
 */
import { createSign } from "node:crypto";
import { env, envState } from "./env.js";
import { CONTACT_EMAIL } from "./site.js";

export type GoogleConfig = { email: string; key: string; calendarId: string };

export class GoogleError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Service-account credentials, or null (logging what's missing) when not configured. */
export function googleConfig(scope: string): GoogleConfig | null {
  let email = env("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  let key = env("GOOGLE_PRIVATE_KEY");
  const json = env("GOOGLE_SERVICE_ACCOUNT_JSON");
  if (json && (!email || !key)) {
    try {
      const parsed = JSON.parse(json) as { client_email?: string; private_key?: string };
      email ||= parsed.client_email ?? "";
      key ||= parsed.private_key ?? "";
    } catch {
      console.error(`${scope}: GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON`);
    }
  }
  // Keys pasted into dashboards often keep literal "\n" escapes or surrounding quotes.
  key = key.replace(/^"|"$/g, "").replace(/\\n/g, "\n");
  const calendarId = env("GOOGLE_CALENDAR_ID") || CONTACT_EMAIL;
  if (email && key.includes("PRIVATE KEY")) return { email, key, calendarId };
  console.error(
    `${scope}: Google Calendar not configured (VERCEL_ENV=${process.env.VERCEL_ENV ?? "?"}): ` +
      `GOOGLE_SERVICE_ACCOUNT_EMAIL ${envState("GOOGLE_SERVICE_ACCOUNT_EMAIL")}, ` +
      `GOOGLE_PRIVATE_KEY ${envState("GOOGLE_PRIVATE_KEY")}${key && !key.includes("PRIVATE KEY") ? " (not a PEM private key)" : ""}, ` +
      `GOOGLE_SERVICE_ACCOUNT_JSON ${envState("GOOGLE_SERVICE_ACCOUNT_JSON")}.`,
  );
  return null;
}

const b64url = (data: string | Buffer) => Buffer.from(data).toString("base64url");

let cached: { email: string; token: string; expires: number } | null = null;

/** OAuth access token for the Calendar API, cached for the life of the function instance. */
export async function accessToken(c: GoogleConfig): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.email === c.email && cached.expires - 60 > now) return cached.token;

  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: c.email,
      scope: "https://www.googleapis.com/auth/calendar",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  let signature: string;
  try {
    signature = createSign("RSA-SHA256").update(`${header}.${claims}`).sign(c.key, "base64url");
  } catch (e) {
    throw new GoogleError(`private key could not sign: ${(e as Error).message}`, 500);
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${signature}`,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error_description?: string;
    error?: string;
  };
  if (!res.ok || !body.access_token) {
    throw new GoogleError(
      `token request failed: ${res.status} ${body.error_description ?? body.error ?? ""}`,
      res.status,
    );
  }
  cached = { email: c.email, token: body.access_token, expires: now + (body.expires_in ?? 3600) };
  return body.access_token;
}

async function calendarApi<T>(c: GoogleConfig, path: string, init: RequestInit = {}): Promise<T> {
  const token = await accessToken(c);
  const res = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  if (!res.ok) {
    const detail = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    const hint =
      res.status === 404
        ? " (calendar not found: is it shared with the service account email?)"
        : res.status === 403
          ? " (no permission: share the calendar with the service account, “Make changes to events”)"
          : "";
    throw new GoogleError(
      `Calendar API ${res.status}: ${detail?.error?.message ?? res.statusText}${hint}`,
      res.status,
    );
  }
  return (await res.json()) as T;
}

export type CalendarEventTime = { date?: string; dateTime?: string; timeZone?: string };
export type CalendarEvent = {
  id?: string;
  status?: string;
  transparency?: string;
  start: CalendarEventTime;
  end: CalendarEventTime;
};

const calendarPath = (c: GoogleConfig) => `/calendars/${encodeURIComponent(c.calendarId)}`;

/** Events between two instants (recurring events expanded). Only times and status are read. */
export async function listEvents(
  c: GoogleConfig,
  timeMin: string,
  timeMax: string,
): Promise<CalendarEvent[]> {
  const items: CalendarEvent[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 10; page++) {
    const q = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250",
      timeZone: MANILA,
      fields: "items(status,transparency,start,end),nextPageToken",
    });
    if (pageToken) q.set("pageToken", pageToken);
    const res = await calendarApi<{ items?: CalendarEvent[]; nextPageToken?: string }>(
      c,
      `${calendarPath(c)}/events?${q}`,
    );
    items.push(...(res.items ?? []));
    pageToken = res.nextPageToken;
    if (!pageToken) break;
  }
  return items;
}

/** Busy intervals in the calendar between two instants. */
export async function freeBusy(
  c: GoogleConfig,
  timeMin: string,
  timeMax: string,
): Promise<{ start: string; end: string }[]> {
  const res = await calendarApi<{
    calendars?: Record<
      string,
      { busy?: { start: string; end: string }[]; errors?: { reason?: string }[] }
    >;
  }>(c, "/freeBusy", {
    method: "POST",
    body: JSON.stringify({ timeMin, timeMax, timeZone: MANILA, items: [{ id: c.calendarId }] }),
  });
  const cal = res.calendars?.[c.calendarId];
  if (!cal || cal.errors?.length) {
    throw new GoogleError(
      `freeBusy: ${cal?.errors?.map((e) => e.reason).join(", ") || "calendar missing"} (is it shared with the service account?)`,
      404,
    );
  }
  return cal.busy ?? [];
}

/** Creates an event and returns its id and link. */
export async function insertEvent(
  c: GoogleConfig,
  event: Record<string, unknown>,
): Promise<{ id: string; htmlLink?: string }> {
  return calendarApi(c, `${calendarPath(c)}/events`, {
    method: "POST",
    body: JSON.stringify(event),
  });
}

/* ---------- Dates in Asia/Manila ---------- */

export const MANILA = "Asia/Manila";

const manilaDay = new Intl.DateTimeFormat("en-CA", { timeZone: MANILA });
/** YYYY-MM-DD of an instant, in Manila time. */
export const toManilaDate = (instant: Date) => manilaDay.format(instant);

/** YYYY-MM-DD plus n days (calendar arithmetic, no time zones involved). */
export function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Midnight at the start of a Manila calendar day, as an RFC 3339 instant. */
export const manilaMidnight = (iso: string) => `${iso}T00:00:00+08:00`;

/** Every Manila calendar day an event touches. All-day end dates are exclusive. */
export function eventDays(e: CalendarEvent): string[] {
  let first: string;
  let last: string;
  if (e.start.date && e.end.date) {
    first = e.start.date;
    last = addDays(e.end.date, -1);
  } else if (e.start.dateTime && e.end.dateTime) {
    const start = new Date(e.start.dateTime);
    // An event ending exactly at midnight doesn't occupy the next day.
    const end = new Date(Math.max(start.getTime(), new Date(e.end.dateTime).getTime() - 1));
    first = toManilaDate(start);
    last = toManilaDate(end);
  } else {
    return [];
  }
  const days: string[] = [];
  for (let d = first; d <= last && days.length < 366; d = addDays(d, 1)) days.push(d);
  return days;
}

/** Sorted, unique days that have at least one confirmed, busy (not "free") event. */
export function busyDays(events: CalendarEvent[]): string[] {
  const days = new Set<string>();
  for (const e of events) {
    if (e.status === "cancelled" || e.transparency === "transparent") continue;
    for (const d of eventDays(e)) days.add(d);
  }
  return [...days].sort();
}
