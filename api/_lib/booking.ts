/** Booking validation and shared booking types/helpers. */
import { BOOKING_RULES } from "./rules.js";

export type Fields = {
  first_name: string;
  middle_name: string | null;
  last_name: string;
  email: string;
  mobile: string;
  organization: string;
  event_title: string;
  /** One or more of BOOKING_RULES.services. */
  services: string[];
  start_date: string;
  end_date: string | null;
  venue: string;
  photographers: number;
  videographers: number;
  /** photographers + videographers (kept for sorting and older views). */
  shooters: number;
  requests: string | null;
};
export type Errors = Partial<Record<keyof Fields | "letter" | "crew", string>>;
export type Letter = { name: string; type: string; file: Blob };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Today's date in the Philippines (YYYY-MM-DD); the server itself runs in UTC. */
export const todayInManila = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());

export const text = (form: FormData, key: string) => {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
};

export function validate(
  form: FormData,
): { fields: Fields; letter: Letter | null; errors: Errors } | { errors: Errors } {
  const errors: Errors = {};
  const max = BOOKING_RULES.maxLength;
  const required = (key: keyof typeof max, missing: string) => {
    const v = text(form, key);
    if (!v) errors[key] = missing;
    else if (v.length > max[key]) errors[key] = `Keep this under ${max[key]} characters.`;
    return v;
  };

  const first_name = required("first_name", "Enter your first name.");
  const middle_name = text(form, "middle_name");
  if (middle_name.length > max.middle_name) {
    errors.middle_name = `Keep this under ${max.middle_name} characters.`;
  }
  const last_name = required("last_name", "Enter your last name.");
  const email = required("email", "Enter your email address.");
  if (email && !errors.email && !EMAIL.test(email)) errors.email = "Enter a valid email address.";
  const mobile = required("mobile", "Enter a mobile number.");
  if (mobile && !errors.mobile && !new RegExp(`^${BOOKING_RULES.mobilePattern}$`).test(mobile)) {
    errors.mobile = "Enter a Philippine mobile number, like 0917 123 4567.";
  }
  const organization = required("organization", "Enter your organization.");
  const event_title = required("event_title", "Enter the activity or event title.");
  const venue = required("venue", "Enter the event place.");

  const today = todayInManila();
  const start_date = text(form, "start_date");
  if (!DATE.test(start_date)) errors.start_date = "Choose the event date.";
  else if (start_date < today) errors.start_date = "Choose a date from today onward.";

  let end_date: string | null = null;
  if (text(form, "multiday")) {
    end_date = text(form, "end_date");
    if (!DATE.test(end_date)) errors.end_date = "Choose the last day of the event.";
    else if (DATE.test(start_date) && end_date <= start_date) {
      errors.end_date = "The last day must be after the first day.";
    }
  }

  // Services: any number of the allowed ones (checkboxes post one value each).
  const services = [
    ...new Set(
      form
        .getAll("services")
        .map((v) => (typeof v === "string" ? v.trim() : ""))
        .filter((v) => BOOKING_RULES.services.includes(v)),
    ),
  ];
  if (services.length === 0) errors.services = "Choose at least one service.";

  // Crew per role; an empty field means none of that role.
  const { min, max: most, minTotal } = BOOKING_RULES.crew;
  const count = (key: "photographers" | "videographers") => {
    const raw = text(form, key);
    const n = raw === "" ? 0 : Number(raw);
    if (!Number.isInteger(n) || n < min || n > most) {
      errors[key] = `Enter a number from ${min} to ${most}.`;
      return 0;
    }
    return n;
  };
  const photographers = count("photographers");
  const videographers = count("videographers");
  const shooters = photographers + videographers;
  if (!errors.photographers && !errors.videographers && shooters < minTotal) {
    errors.crew = "Ask for at least one photographer or videographer.";
  }

  const requests = text(form, "requests");
  if (requests.length > max.requests)
    errors.requests = `Keep this under ${max.requests} characters.`;

  // An empty file input still sends a nameless, zero-byte file.
  let letter: Letter | null = null;
  const file = form.get("letter");
  if (file && typeof file !== "string" && file.size > 0) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const type = BOOKING_RULES.letterTypes[ext];
    if (!type) errors.letter = "Upload a PDF, Word document, JPG or PNG.";
    else if (file.size > BOOKING_RULES.letterMaxBytes)
      errors.letter = "The letter must be 4 MB or smaller.";
    else letter = { name: file.name, type, file };
  }

  if (Object.keys(errors).length) return { errors };
  return {
    fields: {
      first_name,
      middle_name: middle_name || null,
      last_name,
      email,
      mobile,
      organization,
      event_title,
      services,
      start_date,
      end_date,
      venue,
      photographers,
      videographers,
      shooters,
      requests: requests || null,
    },
    letter,
    errors,
  };
}

/** A saved booking row (what Supabase returns). */
export type BookingStatus = "pending" | "approved" | "declined";

export type Booking = Fields & {
  id: string;
  created_at?: string;
  status?: BookingStatus;
  letter_path: string | null;
  decided_at?: string | null;
  decided_by?: string | null;
  decision_reason?: string | null;
  auto_declined?: boolean;
  calendar_event_id?: string | null;
  calendar_sync_error?: string | null;
};

export const fullName = (f: Pick<Fields, "first_name" | "middle_name" | "last_name">) =>
  [f.first_name, f.middle_name, f.last_name].filter(Boolean).join(" ");

/** Date-only strings (YYYY-MM-DD) read as calendar days, independent of the server's time zone. */
const asDay = (iso: string) => new Date(`${iso}T00:00:00Z`);
const longDate = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/** "Sat, December 5, 2026", or a range like "Sat, December 5 – Mon, December 7, 2026". */
export const formatDates = (f: Pick<Fields, "start_date" | "end_date">) =>
  f.end_date
    ? // formatRange puts thin spaces (U+2009) around the dash; plain spaces are safer in email.
      longDate.formatRange(asDay(f.start_date), asDay(f.end_date)).replace(/ /g, " ")
    : longDate.format(asDay(f.start_date));

export const safeFileName = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(-80) || "letter";

/** "Event Coverage, Video Production". */
export const formatServices = (b: Pick<Fields, "services">) => b.services.join(", ");

/** "2 photographers, 1 videographer" (roles with nobody are left out). */
export function formatCrew(b: Pick<Fields, "photographers" | "videographers">) {
  const part = (n: number, role: string) => (n ? `${n} ${role}${n === 1 ? "" : "s"}` : "");
  return [part(b.photographers, "photographer"), part(b.videographers, "videographer")]
    .filter(Boolean)
    .join(", ");
}
