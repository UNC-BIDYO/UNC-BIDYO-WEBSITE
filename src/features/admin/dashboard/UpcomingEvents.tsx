import { CalendarDays, ChevronRight, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/primitives/card";
import { Separator } from "@/shared/ui/primitives/separator";
import { eventDates, formatCrew, isoDay, type Booking } from "../format";

/* The next approved bookings, soonest first. */
export function UpcomingEvents({
  bookings,
  onOpen,
}: {
  bookings: Booking[];
  onOpen: (booking: Booking) => void;
}) {
  const today = isoDay(new Date());
  const upcoming = bookings
    .filter((b) => b.status === "approved" && (b.end_date ?? b.start_date) >= today)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .slice(0, 8);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming events</CardTitle>
        <CardDescription>Approved bookings, soonest first</CardDescription>
      </CardHeader>
      <CardContent>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming approved events.</p>
        ) : (
          <ul>
            {upcoming.map((b, i) => (
              <li key={b.id}>
                {i > 0 && <Separator />}
                <button
                  type="button"
                  onClick={() => onOpen(b)}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-3 text-left transition-colors hover:bg-accent"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{b.event_title}</p>
                    <p className="truncate text-sm text-muted-foreground">{b.organization}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="size-3.5" />
                        {eventDates(b)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="size-3.5" />
                        {formatCrew(b)}
                      </span>
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
