import { useCallback, useEffect, useState } from "react";
import { api } from "./auth";
import type { Booking } from "./format";

export type BookingsState = {
  bookings: Booking[];
  loading: boolean;
  error: string | null;
  reload: () => void;
  /** Swap in a booking returned by the API after an action. */
  replace: (booking: Booking) => void;
};

/** All bookings for the panel (dashboard, table and sheet all read this one list). */
export function useBookings(): BookingsState {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    api<{ bookings: Booking[] }>("/api/admin/bookings")
      .then((r) => {
        setBookings(r.bookings);
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(reload, [reload]);

  const replace = useCallback(
    (booking: Booking) => setBookings((all) => all.map((b) => (b.id === booking.id ? booking : b))),
    [],
  );

  return { bookings, loading, error, reload, replace };
}

export type DecideResult = {
  booking: Booking;
  calendarSynced?: boolean;
  calendarError?: string;
  emailed?: boolean;
};

export const decide = (id: string, action: "approve" | "decline" | "sync", reason?: string) =>
  api<DecideResult>("/api/admin/decide", {
    method: "POST",
    body: JSON.stringify({ id, action, reason }),
  });

export const letterUrl = (id: string) =>
  api<{ url: string }>(`/api/admin/letter?id=${encodeURIComponent(id)}`).then((r) => r.url);

/** Current hash route: "dashboard" | "bookings" | "settings". */
export function useRoute() {
  const read = () =>
    (window.location.hash.replace(/^#\/?/, "").split("/")[0] || "dashboard") as Route;
  const [route, setRoute] = useState<Route>(read);
  useEffect(() => {
    const onHash = () => setRoute(read());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return route;
}

export type Route = "dashboard" | "bookings" | "settings";
export const ROUTES: Record<Route, string> = {
  dashboard: "Dashboard",
  bookings: "Bookings",
  settings: "Settings",
};
