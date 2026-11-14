/** Calendar-day helpers for date-only values ("YYYY-MM-DD") shown in the visitor's time zone. */

/** "2026-12-05" → local midnight on that calendar day. */
export const parseDay = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** YYYY-MM-DD for a local date. */
export const isoDay = (d: Date) => d.toLocaleDateString("en-CA");
