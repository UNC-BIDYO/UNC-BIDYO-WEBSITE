export const BRAND = "UNC Bidyo";

export const CONTACT_EMAIL = "uncbidyoorg@gmail.com";

export const mailto = (subject?: string) =>
  `mailto:${CONTACT_EMAIL}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;

/** Social profiles for the footer, in display order. Entries with an empty href are hidden. */
export const SOCIAL_LINKS: { label: string; href: string }[] = [
  { label: "Facebook", href: "https://www.facebook.com/UNCBidyo" },
];
