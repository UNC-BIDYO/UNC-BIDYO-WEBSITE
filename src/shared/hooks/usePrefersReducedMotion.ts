import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

const subscribe = (onChange: () => void) => {
  const m = window.matchMedia(QUERY);
  m.addEventListener("change", onChange);
  return () => m.removeEventListener("change", onChange);
};

/**
 * Whether the visitor asked for reduced motion. The prerendered HTML (and hydration)
 * assume false, then React re-renders with the real value straight after hydrating.
 * Anything that must not start before that (e.g. the hero video) should also check
 * useHydrated().
 */
export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
