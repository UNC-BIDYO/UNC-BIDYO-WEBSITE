import { useSyncExternalStore } from "react";

const noop = () => () => {};

/**
 * false in the prerendered HTML and during hydration, true right after.
 * Use it to gate anything that depends on the browser (preferences, media),
 * so the first client render matches the server markup exactly.
 */
export function useHydrated() {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}
