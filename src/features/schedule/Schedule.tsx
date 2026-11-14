import { lazy, Suspense } from "react";
import { FACEBOOK_URL } from "@/shared/lib/site";
import { Container } from "@/shared/ui/Container";
import { SectionHead } from "@/shared/ui/SectionHead";
import { useSchedule } from "./useSchedule";

const ScheduleCalendar = lazy(() => import("./ScheduleCalendar"));

const spoken = new Intl.DateTimeFormat("en-PH", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

/** Public "booked days" calendar from Bidyo's Google Calendar (dates only, no event details). */
export function Schedule() {
  const schedule = useSchedule();
  const count = schedule.status === "ready" ? schedule.booked.length : 0;

  return (
    <section id="schedule" className="scroll-mt-6 pb-section" aria-labelledby="schedule-title">
      <Container className="grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
        <div>
          <SectionHead
            id="schedule-title"
            index="05"
            eyebrow="Schedule"
            title="Booked days"
            intro="Days we're already covering an event. Pick a free date when you book."
          />
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3 font-mono text-xs uppercase tracking-[0.16em]">
            <li className="flex items-center gap-2">
              <span aria-hidden className="size-4 bg-accent" /> Booked
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden className="size-4 border border-line-strong bg-surface" /> Free
            </li>
          </ul>
        </div>

        <div className="min-h-80 border border-line bg-surface p-4 sm:p-6">
          <noscript>
            <p className="text-muted">
              Turn on JavaScript to see booked days, or{" "}
              <a href={FACEBOOK_URL} className="underline underline-offset-4">
                message us on Facebook
              </a>{" "}
              to check a date.
            </p>
          </noscript>
          {schedule.status === "loading" && (
            <p className="text-muted" role="status">
              Loading the schedule…
            </p>
          )}
          {schedule.status === "error" && (
            <p className="text-muted" role="status">
              The schedule is unavailable right now.{" "}
              <a href={FACEBOOK_URL} className="text-ink underline underline-offset-4">
                Message us on Facebook
              </a>{" "}
              to check a date.
            </p>
          )}
          {schedule.status === "ready" && (
            <>
              <p className="mb-4 text-sm text-muted" role="status">
                {count === 0
                  ? "No booked days in the next six months."
                  : `${count} booked ${count === 1 ? "day" : "days"} in the next six months.`}
              </p>
              {count > 0 && (
                <ul className="sr-only" aria-label="Booked days">
                  {schedule.booked.map((d) => (
                    <li key={d.toDateString()}>{spoken.format(d)}</li>
                  ))}
                </ul>
              )}
              <Suspense fallback={<p className="text-muted">Loading the calendar…</p>}>
                <ScheduleCalendar booked={schedule.booked} />
              </Suspense>
            </>
          )}
        </div>
      </Container>
    </section>
  );
}
