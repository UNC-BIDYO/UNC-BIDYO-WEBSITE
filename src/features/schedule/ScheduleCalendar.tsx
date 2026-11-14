import { useSyncExternalStore } from "react";
import { Calendar } from "@/shared/ui/primitives/calendar";

const wide = "(min-width: 768px)";
const subscribe = (notify: () => void) => {
  const mq = window.matchMedia(wide);
  mq.addEventListener("change", notify);
  return () => mq.removeEventListener("change", notify);
};

/* Read-only month view of booked days (no selection). Loaded on demand by Schedule, so
   react-day-picker stays out of the page's first download. */
export default function ScheduleCalendar({ booked }: { booked: Date[] }) {
  const twoMonths = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(wide).matches,
    () => false,
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastMonth = new Date(today.getFullYear(), today.getMonth() + 5, 1);

  return (
    <Calendar
      numberOfMonths={twoMonths ? 2 : 1}
      startMonth={today}
      endMonth={lastMonth}
      // Spill-over days from the next month would repeat booked days in two grids.
      showOutsideDays={false}
      disabled={{ before: today }}
      modifiers={{ booked }}
      modifiersClassNames={{ booked: "bg-accent text-white" }}
      classNames={{
        // Read-only days render as text, not buttons; centre them in their squares.
        day: "relative flex aspect-square w-full items-center justify-center p-0 text-sm select-none",
        today: "font-bold underline decoration-2 underline-offset-4",
      }}
      // The grid is visual; Schedule lists the booked dates for screen readers.
      aria-hidden
      className="w-full bg-transparent p-0 [--cell-size:--spacing(10)] sm:[--cell-size:--spacing(11)]"
    />
  );
}
