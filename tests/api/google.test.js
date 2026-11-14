import { beforeEach, it } from "vitest";
// Tests api/_lib/google.ts and api/schedule.ts.
import assert from "node:assert/strict";
import { createVerify, generateKeyPairSync } from "node:crypto";

const g = await import("../../api/_lib/google.ts");
const { GET } = await import("../../api/schedule.ts");

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = privateKey.export({ type: "pkcs8", format: "pem" });

const calls = [];
let events = [];
let calendarStatus = 200;
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  calls.push({ url: u, init });
  if (u === "https://oauth2.googleapis.com/token") {
    const assertion = new URLSearchParams(String(init.body)).get("assertion");
    const [h, p, s] = assertion.split(".");
    const ok = createVerify("RSA-SHA256").update(`${h}.${p}`).verify(publicKey, s, "base64url");
    if (!ok) return Response.json({ error: "invalid_grant" }, { status: 400 });
    return Response.json({ access_token: "tok-123", expires_in: 3600 });
  }
  if (u.includes("/calendar/v3/") && calendarStatus !== 200) {
    return Response.json({ error: { message: "Not Found" } }, { status: calendarStatus });
  }
  if (u.includes("/events?")) return Response.json({ items: events });
  if (u.endsWith("/freeBusy")) {
    return Response.json({ calendars: { "uncbidyoorg@gmail.com": { busy: [{ start: "2026-12-05T01:00:00Z", end: "2026-12-05T09:00:00Z" }] } } });
  }
  if (u.endsWith("/events") && init.method === "POST") return Response.json({ id: "evt1", htmlLink: "https://cal/evt1" });
  return new Response("?", { status: 500 });
};

const quiet = async (fn) => { const e = console.error; console.error = () => {}; try { return await fn(); } finally { console.error = e; } };

const clear = () => { for (const k of ["GOOGLE_SERVICE_ACCOUNT_EMAIL", "GOOGLE_PRIVATE_KEY", "GOOGLE_SERVICE_ACCOUNT_JSON", "GOOGLE_CALENDAR_ID"]) delete process.env[k]; };

clear();
it("not configured: googleConfig null, schedule 503 no-store", async () => {
  assert.equal(await quiet(() => g.googleConfig("t")), null);
  const res = await quiet(() => GET());
  assert.equal(res.status, 503); assert.equal(res.headers.get("cache-control"), "no-store");
});

it("config from email + key with literal \\n escapes and quotes", async () => {
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = "bidyo@proj.iam.gserviceaccount.com";
  process.env.GOOGLE_PRIVATE_KEY = `"${pem.replace(/\n/g, "\\n")}"`;
  const c = g.googleConfig("t");
  assert.equal(c.email, "bidyo@proj.iam.gserviceaccount.com");
  assert.ok(c.key.startsWith("-----BEGIN PRIVATE KEY-----\n")); assert.equal(c.calendarId, "uncbidyoorg@gmail.com");
});

it("config from the whole JSON key", async () => {
  clear();
  process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({ client_email: "json@proj.iam.gserviceaccount.com", private_key: pem });
  const c = g.googleConfig("t");
  assert.equal(c.email, "json@proj.iam.gserviceaccount.com"); assert.ok(c.key.includes("PRIVATE KEY"));
});

it("signed JWT is accepted (verified with the public key) and the token is cached", async () => {
  calls.length = 0;
  const c = g.googleConfig("t");
  assert.equal(await g.accessToken(c), "tok-123");
  assert.equal(await g.accessToken(c), "tok-123");
  assert.equal(calls.filter((x) => x.url.includes("oauth2")).length, 1);
  const claims = JSON.parse(Buffer.from(new URLSearchParams(String(calls[0].init.body)).get("assertion").split(".")[1], "base64url"));
  assert.equal(claims.scope, "https://www.googleapis.com/auth/calendar");
  assert.equal(claims.aud, "https://oauth2.googleapis.com/token");
});

it("busyDays: all-day, multi-day, timed across midnight, free/cancelled skipped", async () => {
  const days = g.busyDays([
    { start: { date: "2026-12-05" }, end: { date: "2026-12-06" } }, // one all-day day
    { start: { date: "2026-12-10" }, end: { date: "2026-12-13" } }, // 10, 11, 12
    { start: { dateTime: "2026-12-20T22:00:00+08:00" }, end: { dateTime: "2026-12-21T02:00:00+08:00" } }, // 20, 21
    { start: { dateTime: "2026-12-24T18:00:00+08:00" }, end: { dateTime: "2026-12-25T00:00:00+08:00" } }, // 24 only
    { start: { dateTime: "2026-12-27T17:00:00Z" }, end: { dateTime: "2026-12-27T18:00:00Z" } }, // = Dec 28 01:00 Manila
    { start: { date: "2026-12-15" }, end: { date: "2026-12-16" }, transparency: "transparent" },
    { start: { date: "2026-12-16" }, end: { date: "2026-12-17" }, status: "cancelled" },
    { start: { date: "2026-12-05" }, end: { date: "2026-12-06" } }, // duplicate day
  ]);
  assert.deepEqual(days, ["2026-12-05", "2026-12-10", "2026-12-11", "2026-12-12", "2026-12-20", "2026-12-21", "2026-12-24", "2026-12-28"]);
});

it("addDays crosses months and years", async () => {
  assert.equal(g.addDays("2026-12-31", 1), "2027-01-01"); assert.equal(g.addDays("2026-03-01", -1), "2026-02-28");
});

it("schedule GET: only dates, from today, cached at the edge", async () => {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
  events = [
    { start: { date: g.addDays(today, 3) }, end: { date: g.addDays(today, 5) } },
    { start: { date: g.addDays(today, -10) }, end: { date: g.addDays(today, -9) } }, // past: dropped
  ];
  calls.length = 0;
  const res = await GET();
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.deepEqual(body.booked, [g.addDays(today, 3), g.addDays(today, 4)]);
  assert.equal(body.from, today); assert.equal(body.blockBooked, false);
  assert.equal(res.headers.get("cache-control"), "public, s-maxage=60, stale-while-revalidate=60");
  assert.deepEqual(Object.keys(body).sort(), ["blockBooked", "booked", "from", "to"]);
  const list = calls.find((c) => c.url.includes("/events?"));
  assert.match(list.url, /calendars\/uncbidyoorg%40gmail\.com\/events\?/);
  assert.match(list.url, /fields=items%28status%2Ctransparency%2Cstart%2Cend%29/, "only times/status requested");
  assert.equal(list.init.headers.Authorization, "Bearer tok-123");
});

it("calendar not shared (404): schedule 502 no-store, log has the sharing hint", async () => {
  calendarStatus = 404;
  const logged = [];
  const e = console.error; console.error = (...a) => logged.push(a.join(" "));
  const res = await GET();
  console.error = e; calendarStatus = 200;
  assert.equal(res.status, 502); assert.equal(res.headers.get("cache-control"), "no-store");
  assert.match(logged.join(" "), /shared with the service account/);
});

it("freeBusy and insertEvent requests", async () => {
  const c = g.googleConfig("t");
  calls.length = 0;
  const busy = await g.freeBusy(c, g.manilaMidnight("2026-12-05"), g.manilaMidnight("2026-12-06"));
  assert.equal(busy.length, 1);
  const fb = JSON.parse(calls.at(-1).init.body);
  assert.equal(fb.timeMin, "2026-12-05T00:00:00+08:00"); assert.deepEqual(fb.items, [{ id: "uncbidyoorg@gmail.com" }]);
  const ev = await g.insertEvent(c, { summary: "x", start: { date: "2026-12-05" }, end: { date: "2026-12-06" } });
  assert.equal(ev.id, "evt1");
});

