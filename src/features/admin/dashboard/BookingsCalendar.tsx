import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/primitives/card";
import { Calendar } from "@/shared/ui/primitives/calendar";
import { bookingDays, eventDates, isoDay, parseDay, StatusBadge, type Booking } from "../format";

/* shadcn/ui Calendar with approved bookings marked (and pending ones outlined); picking a day
   lists what's on it. */
export function BookingsCalendar({
  bookings,
  onOpen,
}: {
  bookings: Booking[];
  onOpen: (booking: Booking) => void;
}) {
  const [day, setDay] = useState<Date | undefined>(new Date());

  const { approved, pending, byDay } = useMemo(() => {
    const byDay = new Map<string, Booking[]>();
    const approved = new Set<string>();
    const pending = new Set<string>();
    for (const b of bookings) {
      if (b.status === "declined") continue;
      for (const d of bookingDays(b)) {
        byDay.set(d, [...(byDay.get(d) ?? []), b]);
        (b.status === "approved" ? approved : pending).add(d);
      }
    }
    return { approved: [...approved].map(parseDay), pending: [...pending].map(parseDay), byDay };
  }, [bookings]);

  const onDay = day ? (byDay.get(isoDay(day)) ?? []) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendar</CardTitle>
        <CardDescription>Approved bookings are filled; pending ones are outlined</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 @3xl/main:flex-row">
        <Calendar
          mode="single"
          selected={day}
          onSelect={setDay}
          modifiers={{ approved, pending }}
          modifiersClassNames={{
            approved: "[&>button]:bg-primary/15 [&>button]:font-semibold",
            pending: "[&>button]:ring-1 [&>button]:ring-chart-4",
          }}
          className="mx-auto rounded-lg border shadow-xs @3xl/main:mx-0"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="text-sm font-medium">
            {day
              ? day.toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric" })
              : "Pick a day"}
          </p>
          {onDay.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing booked.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {onDay.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(b)}
                    className="flex w-full flex-col gap-1 rounded-lg border p-3 text-left text-sm transition-colors hover:bg-accent"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">{b.event_title}</span>
                      <StatusBadge status={b.status} />
                    </span>
                    <span className="truncate text-muted-foreground">
                      {b.organization} · {eventDates(b)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
