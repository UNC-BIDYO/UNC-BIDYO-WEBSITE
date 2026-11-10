export const BRAND = "UNC Bidyo";

export const CONTACT_EMAIL = "uncbidyoorg@gmail.com";

export const mailto = (subject?: string) =>
  `mailto:${CONTACT_EMAIL}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;
