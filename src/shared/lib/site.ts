export const BRAND = "UNC Bidyo";

// TODO: replace with the real inbox before launch.
export const CONTACT_EMAIL = "hello@uncbidyo.example";

export const mailto = (subject?: string) =>
  `mailto:${CONTACT_EMAIL}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;
