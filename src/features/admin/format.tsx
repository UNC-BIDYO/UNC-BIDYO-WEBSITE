import { CircleCheck, CircleX, Clock3 } from "lucide-react";
import type { Booking, BookingStatus } from "../../../api/_lib/booking";
import { Badge } from "@/shared/ui/primitives/badge";

export type { Booking, BookingStatus };

export const fullName = (b: Pick<Booking, "first_name" | "middle_name" | "last_name">) =>
  [b.first_name, b.middle_name, b.last_name].filter(Boolean).join(" ");

/** "2026-12-05" → local midnight on that calendar day. */
export const parseDay = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** YYYY-MM-DD for a local date. */
export const isoDay = (d: Date) => d.toLocaleDateString("en-CA");

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

const STATUS: Record<
  BookingStatus,
  { label: string; variant: "secondary" | "default" | "destructive"; Icon: typeof Clock3 }
> = {
  pending: { label: "Pending", variant: "secondary", Icon: Clock3 },
  approved: { label: "Approved", variant: "default", Icon: CircleCheck },
  declined: { label: "Declined", variant: "destructive", Icon: CircleX },
};

export function StatusBadge({ status }: { status?: BookingStatus }) {
  const s = STATUS[status ?? "pending"];
  return (
    <Badge variant={s.variant}>
      <s.Icon />
      {s.label}
    </Badge>
  );
}
