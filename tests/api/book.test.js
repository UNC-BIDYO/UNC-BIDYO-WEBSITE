// Tests api/book.ts and the email templates with a stubbed fetch.
import assert from "node:assert/strict";
import { beforeEach, it } from "vitest";

const { POST } = await import("../../api/book.ts");
const { renderBookingEmail } = await import("../../api/_lib/email.ts");

const calls = [];
let recentRows = [],
  failCount = false,
  turnstileOk = true;
let failStorage = false,
  failEmail = false,
  failInsert = false;
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  calls.push({ url: u, init });
  if (u.includes("challenges.cloudflare.com")) return Response.json({ success: turnstileOk });
  if (u.includes("/rest/v1/bookings") && (init.method ?? "GET") === "GET") {
    return failCount ? new Response("down", { status: 500 }) : Response.json(recentRows);
  }
  if (u.includes("/storage/") && failStorage) return new Response("boom", { status: 500 });
  if (u.includes("/rest/v1/bookings") && failInsert) return new Response("no", { status: 400 });
  if (u.includes("resend") && failEmail) return new Response("bad", { status: 422 });
  if (u.includes("/rest/v1/bookings")) {
    const row = JSON.parse(init.body);
    return Response.json(
      [{ id: "0b5ecd6a-c097-4a65-9bfd-f17d4f084636", status: "pending", ...row }],
      { status: 201 },
    );
  }
  return new Response(u.includes("resend") ? '{"id":"x"}' : "", { status: 201 });
};

const ENV = {
  SUPABASE_URL: "https://proj.supabase.co/",
  SUPABASE_SERVICE_ROLE_KEY: "sb_secret_abc",
  RESEND_API_KEY: "re_test",
  BOOKING_NOTIFY_TO: "uncbidyoorg@gmail.com",
  BOOKING_FROM: "UNC Bidyo <no-reply@uncbidyo.org>",
};
const setEnv = (on) => {
  for (const [k, v] of Object.entries(ENV)) {
    if (on) process.env[k] = v;
    else delete process.env[k];
  }
};

const future = (days) => new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);
function form(overrides = {}, letter) {
  const f = new FormData();
  const base = {
    first_name: "Juan",
    middle_name: "Santos",
    last_name: "Dela Cruz",
    email: "juan@unc.edu.ph",
    mobile: "0917 123 4567",
    organization: "SCIS",
    event_title: "Intramurals 2026",
    services: "Event Coverage",
    start_date: future(10),
    venue: "UNC Gym",
    photographers: "2",
    videographers: "1",
    requests: "Group photo at 3pm",
    _gotcha: "",
    ...overrides,
  };
  for (const [k, v] of Object.entries(base)) {
    if (v === undefined) continue;
    for (const one of Array.isArray(v) ? v : [v]) f.append(k, one);
  }
  f.append("letter", letter ?? new File([], ""), letter?.name ?? "");
  return f;
}
const req = (f, json = true) =>
  new Request("http://x/api/book", {
    method: "POST",
    body: f,
    headers: json ? { Accept: "application/json" } : {},
  });
const run = async (f, json = true) => {
  calls.length = 0;
  const res = await POST(req(f, json));
  const body = json ? await res.json() : await res.text();
  return { status: res.status, body };
};
const insertCall = () =>
  calls.find((c) => c.url.includes("/rest/v1/bookings") && c.init.method === "POST");
const storageCall = () => calls.find((c) => c.url.includes("/storage/"));
const mails = () =>
  calls.filter((c) => c.url.includes("resend")).map((c) => JSON.parse(c.init.body));
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
beforeEach(() => {
  setEnv(true);
  recentRows = [];
  failCount = false;
  turnstileOk = true;
  delete process.env.TURNSTILE_SECRET_KEY;
});

it("503 when Supabase keys are missing", async () => {
  setEnv(false);
  const r = await quiet(() => run(form()));
  assert.equal(r.status, 503);
  assert.equal(calls.length, 0);
});

it("valid booking: insert (returning row) + customer summary + Bidyo copy", async () => {
  const r = await run(form());
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { ok: true, outcome: "received" });
  const ins = insertCall();
  assert.equal(ins.url, "https://proj.supabase.co/rest/v1/bookings");
  assert.equal(ins.init.headers.Prefer, "return=representation");
  assert.equal(ins.init.headers.Authorization, undefined, "non-JWT key must not be sent as Bearer");
  const row = JSON.parse(ins.init.body);
  assert.equal(row.shooters, 3);
  assert.equal(row.end_date, null);
  assert.equal(row.letter_path, null);
  assert.equal(row.first_name, "Juan");
  assert.equal(row.middle_name, "Santos");
  const [customer, copy] = mails();
  assert.deepEqual(customer.to, ["juan@unc.edu.ph"]);
  assert.equal(customer.reply_to, undefined, "customer email is no-reply");
  assert.equal(customer.from, "UNC Bidyo <no-reply@uncbidyo.org>");
  assert.equal(customer.subject, "We received your booking request: Intramurals 2026");
  assert.match(customer.html, /Booking Request Received/);
  assert.match(customer.html, /Pending review/);
  assert.match(customer.html, /0b5ecd6a-c097-4a65-9bfd-f17d4f084636/);
  assert.match(customer.html, /Dear Juan,/);
  assert.doesNotMatch(
    customer.html,
    /0917 123 4567/,
    "customer copy doesn't repeat contact details",
  );
  assert.deepEqual(copy.to, ["uncbidyoorg@gmail.com"]);
  assert.equal(copy.reply_to, "juan@unc.edu.ph");
  assert.match(copy.subject, /^New booking: Intramurals 2026 \(\w{3}, \w+ \d{1,2}, \d{4}\)$/);
  assert.match(copy.html, /Juan Santos Dela Cruz/);
  assert.match(copy.html, /0917 123 4567/);
  assert.match(copy.text, /Name: Juan Santos Dela Cruz/);
});

it("resend.dev sender: customer summary skipped, Bidyo copy still sent", async () => {
  process.env.BOOKING_FROM = "UNC Bidyo <onboarding@resend.dev>";
  await quiet(() => run(form()));
  process.env.BOOKING_FROM = ENV.BOOKING_FROM;
  const m = mails();
  assert.equal(m.length, 1);
  assert.deepEqual(m[0].to, ["uncbidyoorg@gmail.com"]);
});

it("middle name optional: stored as null, not in the name", async () => {
  await run(form({ middle_name: "" }));
  assert.equal(JSON.parse(insertCall().init.body).middle_name, null);
  assert.match(mails()[1].text, /Name: Juan Dela Cruz\n/);
});

it("legacy JWT key is also sent as Bearer", async () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOi.test";
  await run(form());
  assert.equal(insertCall().init.headers.Authorization, "Bearer eyJhbGciOi.test");
  process.env.SUPABASE_SERVICE_ROLE_KEY = ENV.SUPABASE_SERVICE_ROLE_KEY;
});

it("multi-day + letter: upload, row, attachment only on Bidyo copy, range in subject", async () => {
  const pdf = new File([new Uint8Array([37, 80, 68, 70])], "Request Letter (signed).PDF", {
    type: "application/pdf",
  });
  const r = await run(form({ multiday: "yes", end_date: future(12) }, pdf));
  assert.equal(r.status, 200);
  const up = storageCall(),
    ins = insertCall();
  assert.match(
    up.url,
    /\/storage\/v1\/object\/letters\/\d{4}-\d{2}\/[0-9a-f-]{36}-Request-Letter-signed-\.PDF$/,
  );
  const row = JSON.parse(ins.init.body);
  assert.equal(row.end_date, future(12));
  assert.ok(up.url.endsWith(row.letter_path));
  const [customer, copy] = mails();
  assert.equal(customer.attachments, undefined);
  assert.match(customer.html, /Formal letter/);
  assert.match(customer.html, />Received</);
  assert.equal(copy.attachments[0].content, Buffer.from([37, 80, 68, 70]).toString("base64"));
  assert.match(copy.subject, / – /, "date range in subject");
  assert.match(customer.html, />Dates</);
});

it("end date ignored when multi-day is unticked", async () => {
  await run(form({ end_date: future(12) }));
  assert.equal(JSON.parse(insertCall().init.body).end_date, null);
});

const invalid = [
  ["missing first name", { first_name: "" }, "first_name"],
  ["missing last name", { last_name: " " }, "last_name"],
  ["too-long middle name", { middle_name: "x".repeat(61) }, "middle_name"],
  ["bad email", { email: "juan@unc" }, "email"],
  ["bad mobile", { mobile: "12345" }, "mobile"],
  ["past date", { start_date: "2020-01-01" }, "start_date"],
  ["end before start", { multiday: "yes", end_date: future(9) }, "end_date"],
  ["end same day", { multiday: "yes", end_date: future(10) }, "end_date"],
  ["multi-day without end", { multiday: "yes" }, "end_date"],
  ["no crew at all", { photographers: "0", videographers: "" }, "crew"],
  ["11 photographers", { photographers: "11" }, "photographers"],
  ["fractional videographers", { videographers: "1.5" }, "videographers"],
  ["negative photographers", { photographers: "-1" }, "photographers"],
  ["no service", { services: undefined }, "services"],
  ["only unknown services", { services: ["Weddings", "Drone"] }, "services"],
  ["missing venue", { venue: " " }, "venue"],
  ["too-long organization", { organization: "x".repeat(151) }, "organization"],
];
for (const [name, o, field] of invalid) {
  it(`400 ${name}`, async () => {
    const r = await run(form(o));
    assert.equal(r.status, 400);
    assert.ok(r.body.errors[field], JSON.stringify(r.body));
    assert.equal(insertCall(), undefined, "nothing saved");
    assert.equal(mails().length, 0, "nothing sent");
  });
}
for (const ok of ["+63 917 123 4567", "+639171234567", "09171234567", "0917-123-4567"]) {
  it(`mobile accepted: ${ok}`, async () =>
    assert.equal((await run(form({ mobile: ok }))).status, 200));
}
it("400 letter wrong type", async () => {
  const r = await run(form({}, new File(["x"], "virus.exe")));
  assert.equal(r.status, 400);
  assert.ok(r.body.errors.letter);
});
it("400 letter too big", async () => {
  const r = await run(form({}, new File([new Uint8Array(4 * 1024 * 1024 + 1)], "big.pdf")));
  assert.equal(r.status, 400);
  assert.match(r.body.errors.letter, /4 MB/);
});
it("honeypot: 200, nothing saved or sent", async () => {
  const r = await run(form({ _gotcha: "spam" }));
  assert.equal(r.status, 200);
  assert.equal(calls.length, 0);
});
it("storage failure: 502, nothing inserted or sent", async () => {
  failStorage = true;
  const r = await quiet(() => run(form({}, new File(["x"], "a.png"))));
  failStorage = false;
  assert.equal(r.status, 502);
  assert.equal(insertCall(), undefined);
  assert.equal(mails().length, 0);
});
it("insert failure: 502, no emails", async () => {
  failInsert = true;
  const r = await quiet(() => run(form()));
  failInsert = false;
  assert.equal(r.status, 502);
  assert.equal(mails().length, 0);
});
it("email failure still returns 200 (booking saved)", async () => {
  failEmail = true;
  const r = await quiet(() => run(form()));
  failEmail = false;
  assert.equal(r.status, 200);
});
it("no-JS success returns an HTML page", async () => {
  const r = await run(form(), false);
  assert.equal(r.status, 200);
  assert.match(r.body, /<h1>Request sent<\/h1>/);
  assert.match(r.body, /href="\/#book"/);
});
it("no-JS errors are listed and escaped", async () => {
  const r = await run(form({ first_name: "", email: "<b>" }), false);
  assert.equal(r.status, 400);
  assert.match(r.body, /<li>Enter your first name\.<\/li>/);
  assert.doesNotMatch(r.body, /<b>/);
});

// Email templates: every kind renders, escapes input, and carries its subject/status.
const sample = {
  id: "0b5ecd6a-c097-4a65-9bfd-f17d4f084636",
  first_name: "Kurt",
  middle_name: null,
  last_name: "Pasiona",
  email: "kurt@unc.edu.ph",
  mobile: "0917 123 4567",
  organization: "School of Computer and Information Sciences",
  event_title: "Learning-Drive <2026>",
  services: ["Event Coverage", "Video Production"],
  start_date: "2026-09-16",
  end_date: "2026-09-17",
  venue: "Social Hall",
  photographers: 1,
  videographers: 1,
  shooters: 2,
  requests: "Please cover the opening program & awarding.",
  letter_path: "x",
};
const expect = {
  received: [/We received your booking request: Learning-Drive <2026>/, /Pending review/],
  "received-copy": [/^New booking: Learning-Drive <2026> \(/, /Pending review/],
  approved: [/Your booking is confirmed: Learning-Drive <2026>/, /Approved/],
  declined: [/Update on your booking request: Learning-Drive <2026>/, /Not approved/],
  unavailable: [/Date unavailable: Learning-Drive <2026>/, /Date unavailable/],
};
for (const [kind, [subject, pill]] of Object.entries(expect)) {
  it(`email "${kind}": subject, status, escaping`, async () => {
    const m = renderBookingEmail(kind, sample, {
      reason: "We're already covering the university foundation day.",
      letterName: "letter.pdf",
    });
    assert.match(m.subject, subject);
    assert.match(m.html, pill);
    assert.match(m.html, /Learning-Drive &lt;2026&gt;/);
    assert.doesNotMatch(m.html, /<2026>/);
    assert.match(m.html, /Wed, September 16 – Thu, September 17, 2026/);
    assert.match(m.text, /Reference #: 0b5ecd6a/);
    if (kind === "declined") assert.match(m.html, /Reason:<\/strong> We&#39;re already covering/);
    if (kind === "unavailable") assert.match(m.html, /\/#schedule/);
  });
}

// ---- Abuse protection: Cloudflare Turnstile + per-address limit ----
const turnstileCall = () => calls.find((c) => c.url.includes("challenges.cloudflare.com"));

it("Turnstile off (no secret): no verification call, booking saved", async () => {
  const r = await run(form());
  assert.equal(r.status, 200);
  assert.equal(turnstileCall(), undefined);
});

it("Turnstile on, no token: 400 security-check message, nothing saved or sent", async () => {
  process.env.TURNSTILE_SECRET_KEY = "0x-secret";
  const r = await run(form());
  assert.equal(r.status, 400);
  assert.match(r.body.message, /security check/);
  assert.equal(insertCall(), undefined);
  assert.equal(mails().length, 0);
});

it("Turnstile on, token rejected by Cloudflare: 400, nothing saved", async () => {
  process.env.TURNSTILE_SECRET_KEY = "0x-secret";
  turnstileOk = false;
  const r = await quiet(() => run(form({ "cf-turnstile-response": "bad-token" })));
  assert.equal(r.status, 400);
  assert.equal(insertCall(), undefined);
});

it("Turnstile on, valid token: verified with secret + token, booking saved", async () => {
  process.env.TURNSTILE_SECRET_KEY = "0x-secret";
  const r = await run(form({ "cf-turnstile-response": "good-token" }));
  assert.equal(r.status, 200);
  const sent = new URLSearchParams(String(turnstileCall().init.body));
  assert.equal(sent.get("secret"), "0x-secret");
  assert.equal(sent.get("response"), "good-token");
  assert.ok(insertCall());
});

it("4th request from one address within an hour: 429, nothing saved or sent", async () => {
  recentRows = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const r = await quiet(() => run(form()));
  assert.equal(r.status, 429);
  assert.match(r.body.message, /several requests/);
  assert.equal(insertCall(), undefined);
  assert.equal(mails().length, 0);
  const countUrl = calls.find((c) => c.url.includes("select=id")).url;
  assert.match(countUrl, /email=eq\.juan%40unc\.edu\.ph/);
  assert.match(countUrl, /created_at=gte\./);
});

it("counting recent requests fails: the booking still goes through", async () => {
  failCount = true;
  const r = await quiet(() => run(form()));
  assert.equal(r.status, 200);
  assert.ok(insertCall());
});

it("Turnstile on, no-JS post without a token: page points to the contact email", async () => {
  process.env.TURNSTILE_SECRET_KEY = "0x-secret";
  const r = await run(form(), false);
  assert.equal(r.status, 400);
  assert.match(r.body, /needs JavaScript/);
  assert.match(r.body, /uncbidyoorg@gmail\.com/);
});

// ---- Services (several) and crew (per role) ----
it("several services stored as an array; unknown and duplicate ones dropped", async () => {
  const r = await run(
    form({ services: ["Photoshoots", "Video Production", "Weddings", "Photoshoots"] }),
  );
  assert.equal(r.status, 200);
  assert.deepEqual(JSON.parse(insertCall().init.body).services, [
    "Photoshoots",
    "Video Production",
  ]);
});

it("crew per role: stored separately, total in shooters, shown in both emails", async () => {
  const r = await run(form({ photographers: "2", videographers: "1" }));
  assert.equal(r.status, 200);
  const row = JSON.parse(insertCall().init.body);
  assert.equal(row.photographers, 2);
  assert.equal(row.videographers, 1);
  assert.equal(row.shooters, 3);
  for (const m of mails()) {
    assert.match(m.html, /2 photographers, 1 videographer/);
    assert.match(m.text, /Crew: 2 photographers, 1 videographer/);
  }
});

it("videographers only (photographers left empty) is fine", async () => {
  const r = await run(form({ photographers: "", videographers: "1" }));
  assert.equal(r.status, 200);
  const row = JSON.parse(insertCall().init.body);
  assert.deepEqual([row.photographers, row.videographers, row.shooters], [0, 1, 1]);
  assert.match(mails()[0].text, /Crew: 1 videographer\n/);
});

it("email says Services (plural) with several, Service with one", async () => {
  await run(form({ services: ["Event Coverage", "Photoshoots"] }));
  assert.match(mails()[0].text, /Services: Event Coverage, Photoshoots/);
  await run(form({ services: "Photoshoots" }));
  assert.match(mails()[0].text, /Service: Photoshoots/);
});

it("BOOKING_RULES.services matches the service cards (+ Other)", async () => {
  const { BOOKING_RULES } = await import("../../api/_lib/rules.ts");
  const { services } = await import("../../src/features/services/serviceList.ts");
  assert.deepEqual([...BOOKING_RULES.services], [...services.map((s) => s.title), "Other"]);
});
