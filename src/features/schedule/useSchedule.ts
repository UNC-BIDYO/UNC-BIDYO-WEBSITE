import { useEffect, useSyncExternalStore } from "react";
import { parseDay } from "@/shared/lib/dates";

/** Booked days from /api/schedule (dates only), shared by the Schedule section and the booking
    date picker. Loaded once on the first mount, then refreshed when the visitor comes back to
    the tab and every few minutes while it's open, so new calendar events show up without a
    page reload. */
export type ScheduleState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; booked: Date[]; blockBooked: boolean };

/** Refresh at most this often (the API itself is cached for about a minute). */
const MIN_REFRESH_MS = 60_000;
/** Refresh this often while the page stays open and visible. */
const POLL_MS = 5 * 60_000;

let state: ScheduleState = { status: "loading" };
let loadedAt = 0;
let inFlight = false;
let mounted = 0;
const listeners = new Set<() => void>();

const set = (next: ScheduleState) => {
  state = next;
  listeners.forEach((notify) => notify());
};

function load() {
  if (inFlight) return;
  inFlight = true;
  fetch("/api/schedule", { headers: { Accept: "application/json" }, cache: "no-store" })
    .then(async (res) => {
      if (!res.ok) throw new Error(String(res.status));
      const body = (await res.json()) as { booked?: string[]; blockBooked?: boolean };
      loadedAt = Date.now();
      set({
        status: "ready",
        booked: (body.booked ?? []).map(parseDay),
        blockBooked: !!body.blockBooked,
      });
    })
    // A failed refresh keeps the dates already shown; only a failed first load shows the error.
    .catch(() => state.status !== "ready" && set({ status: "error" }))
    .finally(() => {
      inFlight = false;
    });
}

/** Reloads if the data is older than MIN_REFRESH_MS and the page is visible. */
function refreshIfStale() {
  if (document.visibilityState === "visible" && Date.now() - loadedAt >= MIN_REFRESH_MS) load();
}

/** Starts loading and refreshing while at least one component uses the schedule. */
function start() {
  mounted += 1;
  if (mounted > 1) return () => void (mounted -= 1);
  if (state.status !== "ready" || Date.now() - loadedAt >= MIN_REFRESH_MS) load();
  document.addEventListener("visibilitychange", refreshIfStale);
  window.addEventListener("focus", refreshIfStale);
  const timer = window.setInterval(refreshIfStale, POLL_MS);
  return () => {
    mounted -= 1;
    if (mounted > 0) return;
    document.removeEventListener("visibilitychange", refreshIfStale);
    window.removeEventListener("focus", refreshIfStale);
    window.clearInterval(timer);
  };
}

const subscribe = (notify: () => void) => {
  listeners.add(notify);
  return () => listeners.delete(notify);
};

/** Returns the schedule state (client only), keeping it fresh while mounted. */
export function useSchedule(): ScheduleState {
  useEffect(start, []);
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => ({ status: "loading" }) as const,
  );
}
