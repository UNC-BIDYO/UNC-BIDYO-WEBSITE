import { useEffect, useSyncExternalStore } from "react";

/** Booked days from /api/schedule (dates only), shared by the Schedule section and the booking
    date picker: one request per page view. */
export type ScheduleState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; booked: Date[]; blockBooked: boolean };

let state: ScheduleState = { status: "loading" };
let started = false;
const listeners = new Set<() => void>();

const set = (next: ScheduleState) => {
  state = next;
  listeners.forEach((notify) => notify());
};

/** "2026-12-05" → local midnight on that calendar day (what the calendar compares against). */
const toLocalDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

function load() {
  if (started) return;
  started = true;
  fetch("/api/schedule", { headers: { Accept: "application/json" } })
    .then(async (res) => {
      if (!res.ok) throw new Error(String(res.status));
      const body = (await res.json()) as { booked?: string[]; blockBooked?: boolean };
      set({
        status: "ready",
        booked: (body.booked ?? []).map(toLocalDate),
        blockBooked: !!body.blockBooked,
      });
    })
    .catch(() => set({ status: "error" }));
}

const subscribe = (notify: () => void) => {
  listeners.add(notify);
  return () => listeners.delete(notify);
};

/** Starts the request on the first mount (client only) and returns its state. */
export function useSchedule(): ScheduleState {
  useEffect(load, []);
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => ({ status: "loading" }) as const,
  );
}
