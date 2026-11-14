import { beforeEach, it } from "vitest";
// Tests api/admin/* with an in-memory Supabase/Google/Resend stand-in.
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";

const bookingsApi = await import("../../api/admin/bookings.ts");
const decideApi = await import("../../api/admin/decide.ts");
const settingsApi = await import("../../api/admin/settings.ts");
const letterApi = await import("../../api/admin/letter.ts");

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
Object.assign(process.env, {
  SUPABASE_URL: "https://db.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "sb_secret_x",
  RESEND_API_KEY: "re_x",
  BOOKING_NOTIFY_TO: "uncbidyoorg@gmail.com",
  BOOKING_FROM: "UNC Bidyo <no-reply@uncbidyo.org>",
  GOOGLE_SERVICE_ACCOUNT_EMAIL: "svc@p.iam.gserviceaccount.com",
  GOOGLE_PRIVATE_KEY: privateKey.export({ type: "pkcs8", format: "pem" }),
});
delete process.env.ADMIN_EMAILS;

// ---- in-memory world ----
const tokens = { "tok-admin": "UNCBidyoOrg@gmail.com", "tok-other": "someone@unc.edu.ph" };
let rows, settings, mails, events, googleDown;
const base = (over) => ({
  id: crypto.randomUUID(), created_at: "2026-11-01T00:00:00Z", status: "pending",
  first_name: "Juan", middle_name: null, last_name: "Cruz", email: "juan@unc.edu.ph", mobile: "0917 123 4567",
  organization: "SCIS", event_title: "Intramurals", service: "Event Coverage", start_date: "2026-12-05",
  end_date: "2026-12-07", venue: "Gym", shooters: 3, requests: null, letter_path: "2026-11/abc-letter.pdf",
  decided_at: null, decided_by: null, decision_reason: null, auto_declined: false, calendar_event_id: null,
  calendar_sync_error: null, ...over,
});
const reset = () => {
  rows = [base({ id: "b1" }), base({ id: "b2", letter_path: null }), base({ id: "b3", status: "approved" })];
  settings = { overlap_check: false }; mails = []; events = []; googleDown = false;
};
const filters = (u) => {
  const q = new URL(u).searchParams; const f = {};
  for (const [k, v] of q) if (v.startsWith("eq.")) f[k] = decodeURIComponent(v.slice(3));
  return f;
};
const match = (r, f) => Object.entries(f).every(([k, v]) => String(r[k]) === v);

globalThis.fetch = async (url, init = {}) => {
  const u = String(url), method = init.method ?? "GET";
  if (u.endsWith("/auth/v1/user")) {
    const t = init.headers.Authorization?.replace("Bearer ", "");
    return tokens[t] ? Response.json({ email: tokens[t] }) : Response.json({ msg: "bad jwt" }, { status: 401 });
  }
  if (u.includes("/rest/v1/bookings")) {
    const f = filters(u);
    if (method === "GET") return Response.json(rows.filter((r) => match(r, f)));
    if (method === "PATCH") {
      const hit = rows.filter((r) => match(r, f)); const patch = JSON.parse(init.body);
      hit.forEach((r) => Object.assign(r, patch)); return Response.json(hit);
    }
  }
  if (u.includes("/rest/v1/settings")) {
    if (method === "GET") { const k = filters(u).key; return Response.json(k in settings ? [{ value: settings[k] }] : []); }
    const b = JSON.parse(init.body); settings[b.key] = b.value; return new Response(null, { status: 201 });
  }
  if (u.includes("/storage/v1/object/sign/letters/")) {
    return Response.json({ signedURL: `/object/sign/letters/${u.split("/letters/")[1]}?token=t` });
  }
  if (u.includes("oauth2.googleapis.com")) return Response.json({ access_token: "g", expires_in: 3600 });
  if (u.includes("googleapis.com/calendar") && method === "POST") {
    if (googleDown) return Response.json({ error: { message: "Forbidden" } }, { status: 403 });
    const e = JSON.parse(init.body); events.push(e); return Response.json({ id: `evt${events.length}` });
  }
  if (u.includes("api.resend.com")) { mails.push(JSON.parse(init.body)); return Response.json({ id: "m" }); }
  return new Response(`unexpected ${method} ${u}`, { status: 500 });
};

const req = (path, { token = "tok-admin", method = "GET", body } = {}) =>
  new Request(`http://x${path}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
const call = async (fn, r) => { const res = await fn(r); return { status: res.status, body: await res.json(), cache: res.headers.get("cache-control") }; };
const decide = (body, token) => call(decideApi.POST, req("/api/admin/decide", { method: "POST", body, token }));
const quiet = async (fn) => { const e = console.error, w = console.warn, i = console.info; console.error = console.warn = console.info = () => {}; try { return await fn(); } finally { console.error = e; console.warn = w; console.info = i; } };

beforeEach(() => reset());

it("no token → 401; expired token → 401; non-admin → 403; admin (any case) → 200", async () => {
  assert.equal((await call(bookingsApi.GET, req("/api/admin/bookings", { token: null }))).status, 401);
  assert.equal((await call(bookingsApi.GET, req("/api/admin/bookings", { token: "nope" }))).status, 401);
  assert.equal((await quiet(() => call(bookingsApi.GET, req("/api/admin/bookings", { token: "tok-other" })))).status, 403);
  const ok = await call(bookingsApi.GET, req("/api/admin/bookings"));
  assert.equal(ok.status, 200); assert.equal(ok.body.bookings.length, 3); assert.equal(ok.cache, "no-store");
});

it("ADMIN_EMAILS controls who is an admin", async () => {
  process.env.ADMIN_EMAILS = "someone@unc.edu.ph, other@x.com";
  assert.equal((await call(bookingsApi.GET, req("/api/admin/bookings", { token: "tok-other" }))).status, 200);
  assert.equal((await quiet(() => call(bookingsApi.GET, req("/api/admin/bookings")))).status, 403);
  delete process.env.ADMIN_EMAILS;
});

it("approve: status, decided_by, calendar event (all-day, exclusive end), confirmed email", async () => {
  const r = await decide({ id: "b1", action: "approve" });
  assert.equal(r.status, 200); assert.equal(r.body.calendarSynced, true); assert.equal(r.body.emailed, true);
  const b = rows.find((x) => x.id === "b1");
  assert.equal(b.status, "approved"); assert.equal(b.decided_by, "uncbidyoorg@gmail.com"); assert.ok(b.decided_at);
  assert.equal(b.calendar_event_id, "evt1"); assert.equal(b.calendar_sync_error, null);
  assert.equal(events.length, 1);
  assert.deepEqual(events[0].start, { date: "2026-12-05" }); assert.deepEqual(events[0].end, { date: "2026-12-08" });
  assert.equal(events[0].summary, "[Bidyo] Intramurals (SCIS)"); assert.match(events[0].description, /Reference #: b1/);
  assert.equal(mails.length, 1); assert.deepEqual(mails[0].to, ["juan@unc.edu.ph"]);
  assert.equal(mails[0].subject, "Your booking is confirmed: Intramurals");
});

it("approve twice → 409, no second event or email", async () => {
  await decide({ id: "b1", action: "approve" });
  const again = await decide({ id: "b1", action: "approve" });
  assert.equal(again.status, 409); assert.equal(events.length, 1); assert.equal(mails.length, 1);
});

it("decline needs a reason; with one: status, reason, declined email with the reason", async () => {
  assert.equal((await decide({ id: "b2", action: "decline" })).status, 400);
  assert.equal((await decide({ id: "b2", action: "decline", reason: "x".repeat(501) })).status, 400);
  const r = await decide({ id: "b2", action: "decline", reason: "  Fully booked that week.  " });
  assert.equal(r.status, 200); assert.equal(events.length, 0);
  const b = rows.find((x) => x.id === "b2");
  assert.equal(b.status, "declined"); assert.equal(b.decision_reason, "Fully booked that week.");
  assert.equal(mails[0].subject, "Update on your booking request: Intramurals");
  assert.match(mails[0].html, /Fully booked that week\./);
});

it("calendar failure: still approved, error saved, then sync retries and clears it", async () => {
  googleDown = true;
  const r = await quiet(() => decide({ id: "b1", action: "approve" }));
  assert.equal(r.status, 200); assert.equal(r.body.calendarSynced, false); assert.match(r.body.calendarError, /403/);
  const b = rows.find((x) => x.id === "b1");
  assert.equal(b.status, "approved"); assert.match(b.calendar_sync_error, /share the calendar/);
  assert.equal(mails.length, 1, "customer still told it's confirmed");
  googleDown = false;
  const retry = await decide({ id: "b1", action: "sync" });
  assert.equal(retry.body.calendarSynced, true); assert.equal(b.calendar_event_id, "evt1"); assert.equal(b.calendar_sync_error, null);
  const again = await decide({ id: "b1", action: "sync" });
  assert.equal(again.body.calendarSynced, true); assert.equal(events.length, 1, "no duplicate event");
});

it("sync on a pending booking → 409; unknown id → 404; bad action → 400", async () => {
  assert.equal((await decide({ id: "b2", action: "sync" })).status, 409);
  assert.equal((await decide({ id: "zzz", action: "approve" })).status, 404);
  assert.equal((await decide({ id: "b1", action: "delete" })).status, 400);
});

it("non-admin can't decide", async () => {
  assert.equal((await quiet(() => decide({ id: "b1", action: "approve" }, "tok-other"))).status, 403);
  assert.equal(rows.find((x) => x.id === "b1").status, "pending");
});

it("resend.dev sender: decision saved, customer email skipped", async () => {
  process.env.BOOKING_FROM = "UNC Bidyo <onboarding@resend.dev>";
  const r = await quiet(() => decide({ id: "b2", action: "decline", reason: "No." }));
  process.env.BOOKING_FROM = "UNC Bidyo <no-reply@uncbidyo.org>";
  assert.equal(r.status, 200); assert.equal(r.body.emailed, false); assert.equal(mails.length, 0);
});

it("settings: GET default false, PUT true, GET true; bad body → 400", async () => {
  assert.equal((await call(settingsApi.GET, req("/api/admin/settings"))).body.overlapCheck, false);
  const put = await quiet(() => call(settingsApi.PUT, req("/api/admin/settings", { method: "PUT", body: { overlapCheck: true } })));
  assert.equal(put.body.overlapCheck, true); assert.equal(settings.overlap_check, true);
  assert.equal((await call(settingsApi.GET, req("/api/admin/settings"))).body.overlapCheck, true);
  assert.equal((await call(settingsApi.PUT, req("/api/admin/settings", { method: "PUT", body: { overlapCheck: "yes" } }))).status, 400);
});

it("letter: signed URL; no letter → 404; missing id → 400", async () => {
  const r = await call(letterApi.GET, req("/api/admin/letter?id=b1"));
  assert.equal(r.status, 200); assert.equal(r.body.url, "https://db.supabase.co/storage/v1/object/sign/letters/2026-11/abc-letter.pdf?token=t");
  assert.equal((await call(letterApi.GET, req("/api/admin/letter?id=b2"))).status, 404);
  assert.equal((await call(letterApi.GET, req("/api/admin/letter"))).status, 400);
});

