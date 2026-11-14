import {
  formatCrew,
  formatServices,
  fullName,
  type Booking,
  type BookingStatus,
} from "@api/booking";
import { isoDay, parseDay } from "@/shared/lib/dates";

export type { Booking, BookingStatus };
export { formatCrew, formatServices, fullName, isoDay, parseDay };

const day = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" });
const dateTime = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** "Dec 5, 2026" or "Dec 5 – 7, 2026". */
export const eventDates = (b: Pick<Booking, "start_date" | "end_date">) =>
  b.end_date
    ? day.formatRange(parseDay(b.start_date), parseDay(b.end_date)).replace(/ /g, " ")
    : day.format(parseDay(b.start_date));

export const submittedAt = (iso?: string | null) => (iso ? dateTime.format(new Date(iso)) : "—");

/** Every calendar day a booking covers (YYYY-MM-DD). */
export function bookingDays(b: Pick<Booking, "start_date" | "end_date">): string[] {
  const days: string[] = [];
  const end = parseDay(b.end_date ?? b.start_date);
  for (let d = parseDay(b.start_date); d <= end && days.length < 60; d.setDate(d.getDate() + 1)) {
    days.push(isoDay(d));
  }
  return days;
}
