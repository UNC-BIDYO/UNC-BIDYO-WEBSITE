/** Booking form limits, shared by /api/book and the form (src/features/booking), so the
    browser and the server check the same rules. Imports nothing, so the browser bundle can use it. */
export const BOOKING_RULES = {
  maxLength: {
    first_name: 60,
    middle_name: 60,
    last_name: 60,
    email: 254,
    mobile: 20,
    organization: 150,
    event_title: 150,
    service: 60,
    venue: 200,
    requests: 2000,
  },
  /** Philippine mobile: 09XX XXX XXXX or +63 9XX XXX XXXX, spaces/dashes allowed. Also used as
      the input's HTML `pattern`, which browsers compile with the `v` flag, so `-` is escaped. */
  mobilePattern: "(\\+63|0)[\\s\\-]?9\\d{2}[\\s\\-]?\\d{3}[\\s\\-]?\\d{4}",
  shooters: { min: 1, max: 10 },
  /** Vercel rejects requests over 4.5 MB, so the letter stays under that with the other fields. */
  letterMaxBytes: 4 * 1024 * 1024,
  letterTypes: {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
  } as Record<string, string>,
} as const;
