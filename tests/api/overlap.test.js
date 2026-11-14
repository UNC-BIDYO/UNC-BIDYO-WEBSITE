import { beforeEach, it } from "vitest";
// Tests the Phase 5 overlap check in api/book.ts and blockBooked in api/schedule.ts.
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";

const { POST } = await import("../../api/book.ts");
const schedule = await import("../../api/schedule.ts");

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const ENV = {
  SUPABASE_URL: "https://db.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "sb_secret_x",
  RESEND_API_KEY: "re_x",
  BOOKING_NOTIFY_TO: "uncbidyoorg@gmail.com",
  BOOKING_FROM: "UNC Bidyo <no-reply@uncbidyo.org>",
  GOOGLE_SERVICE_ACCOUNT_EMAIL: "svc@p.iam.gserviceaccount.com",
  GOOGLE_PRIVATE_KEY: privateKey.export({ type: "pkcs8", format: "pem" }),
};
Object.assign(process.env, ENV);

let settings, rows, mails, busyDays, googleStatus, freeBusyCalls, settingsDown;
const reset = () => {
  settings = { overlap_check: false };
  rows = [];
  mails = [];
  busyDays = [];
  googleStatus = 200;
  freeBusyCalls = [];
  settingsDown = false;
};
globalThis.fetch = async (url, init = {}) => {
  const u = String(url),
    method = init.method ?? "GET";
  if (u.includes("/rest/v1/settings")) {
    if (settingsDown) return new Response("down", { status: 500 });
    const k = new URL(u).searchParams.get("key")?.slice(3);
    return Response.json(k in settings ? [{ value: settings[k] }] : []);
  }
  if (u.includes("/rest/v1/bookings") && method === "POST") {
    const r = { id: crypto.randomUUID(), status: "pending", ...JSON.parse(init.body) };
    rows.push(r);
    return Response.json([r], { status: 201 });
  }
  if (u.includes("/storage/")) return new Response("{}", { status: 200 });
  if (u.includes("oauth2.googleapis.com"))
    return Response.json({ access_token: "g", expires_in: 3600 });
  if (u.endsWith("/freeBusy")) {
    if (googleStatus !== 200)
      return Response.json({ error: { message: "nope" } }, { status: googleStatus });
    const b = JSON.parse(init.body);
    freeBusyCalls.push(b);
    // A day is busy if its Manila-midnight window overlaps [timeMin, timeMax).
    const busy = busyDays
      .filter((d) => `${d}T00:00:00+08:00` < b.timeMax && b.timeMin < `${next(d)}T00:00:00+08:00`)
      .map((d) => ({ start: `${d}T01:00:00Z`, end: `${d}T05:00:00Z` }));
    return Response.json({ calendars: { [b.items[0].id]: { busy } } });
  }
  if (u.includes("googleapis.com/calendar")) return Response.json({ items: [] });
  if (u.includes("api.resend.com")) {
    mails.push(JSON.parse(init.body));
    return Response.json({ id: "m" });
  }
  return new Response(`unexpected ${method} ${u}`, { status: 500 });
};
const next = (d) => {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + 1);
  return x.toISOString().slice(0, 10);
};
const future = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

function form(over = {}) {
  const f = new FormData();
  for (const [k, v] of Object.entries({
    first_name: "Juan",
    last_name: "Cruz",
    email: "juan@unc.edu.ph",
    mobile: "09171234567",
    organization: "SCIS",
    event_title: "Intramurals",
    service: "Event Coverage",
    start_date: future(10),
    venue: "Gym",
    shooters: "2",
    _gotcha: "",
    ...over,
  }))
    f.append(k, v);
  f.append("letter", new File([], ""), "");
  return f;
}
const run = async (over, json = true) => {
  const res = await POST(
    new Request("http://x/api/book", {
      method: "POST",
      body: form(over),
      headers: json ? { Accept: "application/json" } : {},
    }),
  );
  return { status: res.status, body: json ? await res.json() : await res.text() };
};
const quiet = async (fn) => {
  const e = console.error,
    w = console.warn;
  console.error = console.warn = () => {};
  try {
    return await fn();
  } finally {
    console.error = e;
    console.warn = w;
  }
};

beforeEach(() => reset());

it("switch off: no freeBusy call, pending, summary email", async () => {
  busyDays = [future(10)];
  const r = await run();
  assert.deepEqual(r.body, { ok: true, outcome: "received" });
  assert.equal(freeBusyCalls.length, 0);
  assert.equal(rows[0].status, "pending");
  assert.equal(mails[0].subject, "We received your booking request: Intramurals");
});

it("switch on, busy day: auto-declined, unavailable email, Auto-declined copy", async () => {
  settings.overlap_check = true;
  busyDays = [future(10)];
  const r = await run();
  assert.deepEqual(r.body, { ok: true, outcome: "unavailable" });
  const row = rows[0];
  assert.equal(row.status, "declined");
  assert.equal(row.auto_declined, true);
  assert.equal(row.decision_reason, "Date unavailable (already booked)");
  assert.equal(row.decided_by, "automatic overlap check");
  assert.ok(row.decided_at);
  const [customer, copy] = mails;
  assert.equal(customer.subject, "Date unavailable: Intramurals");
  assert.deepEqual(customer.to, ["juan@unc.edu.ph"]);
  assert.match(customer.html, /\/#schedule/);
  assert.match(copy.subject, /^Auto-declined: Intramurals \(/);
  assert.equal(copy.reply_to, "juan@unc.edu.ph");
  assert.ok(!mails.some((m) => /We received/.test(m.subject)), "no 'received' email");
});

it("freeBusy covers whole Manila days [start 00:00, end+1 00:00)", async () => {
  settings.overlap_check = true;
  await run({ multiday: "yes", end_date: future(12) });
  assert.equal(freeBusyCalls[0].timeMin, `${future(10)}T00:00:00+08:00`);
  assert.equal(freeBusyCalls[0].timeMax, `${next(future(12))}T00:00:00+08:00`);
});

it("multi-day request clashing only on its last day: declined", async () => {
  settings.overlap_check = true;
  busyDays = [future(12)];
  const r = await run({ multiday: "yes", end_date: future(12) });
  assert.equal(r.body.outcome, "unavailable");
  assert.equal(rows[0].status, "declined");
});

it("busy day just after the range doesn't count", async () => {
  settings.overlap_check = true;
  busyDays = [future(11)];
  const r = await run();
  assert.equal(r.body.outcome, "received");
  assert.equal(rows[0].status, "pending");
});

it("switch on, free day: pending as normal", async () => {
  settings.overlap_check = true;
  const r = await run();
  assert.equal(r.body.outcome, "received");
  assert.equal(rows[0].status, "pending");
  assert.equal(rows[0].calendar_sync_error, undefined);
});

it("Google error: never declined; pending + flag + normal emails", async () => {
  settings.overlap_check = true;
  busyDays = [future(10)];
  googleStatus = 403;
  const r = await quiet(() => run());
  assert.equal(r.body.outcome, "received");
  assert.equal(rows[0].status, "pending");
  assert.match(rows[0].calendar_sync_error, /check the date manually/);
  assert.equal(mails[0].subject, "We received your booking request: Intramurals");
});

it("Google not configured: pending + flag", async () => {
  settings.overlap_check = true;
  delete process.env.GOOGLE_PRIVATE_KEY;
  const r = await quiet(() => run());
  process.env.GOOGLE_PRIVATE_KEY = ENV.GOOGLE_PRIVATE_KEY;
  assert.equal(r.body.outcome, "received");
  assert.match(rows[0].calendar_sync_error, /manually/);
});

it("settings unreadable: treated as off (booking still works)", async () => {
  settingsDown = true;
  busyDays = [future(10)];
  const r = await quiet(() => run());
  assert.equal(r.body.outcome, "received");
  assert.equal(freeBusyCalls.length, 0);
});

it("no-JS: result page says the date is booked and links to the schedule", async () => {
  settings.overlap_check = true;
  busyDays = [future(10)];
  const r = await run({}, false);
  assert.equal(r.status, 200);
  assert.match(r.body, /<h1>That date is already booked<\/h1>/);
  assert.match(r.body, /href="\/#schedule"/);
});

it("schedule: blockBooked follows the switch; false when Supabase is unreachable", async () => {
  settings.overlap_check = true;
  assert.equal((await (await schedule.GET()).json()).blockBooked, true);
  settings.overlap_check = false;
  assert.equal((await (await schedule.GET()).json()).blockBooked, false);
  settings.overlap_check = true;
  settingsDown = true;
  assert.equal((await (await quiet(() => schedule.GET())).json()).blockBooked, false);
});
