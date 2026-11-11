import { useSyncExternalStore } from "react";

/* Which service a "Book now" link asked for, so the form below can preselect it.
   The links still point at #book, so without JavaScript they just scroll to the form. */
let requested = "";
const listeners = new Set<() => void>();

export function requestBooking(service: string) {
  requested = service;
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  return () => listeners.delete(notify);
}

export function useRequestedService() {
  return useSyncExternalStore(
    subscribe,
    () => requested,
    () => "",
  );
}
