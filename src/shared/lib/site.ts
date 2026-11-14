import { CONTACT_EMAIL, FACEBOOK_URL } from "@api/site";

export { CONTACT_EMAIL, FACEBOOK_URL };

export const BRAND = "UNC Bidyo";

export const mailto = (subject?: string) =>
  `mailto:${CONTACT_EMAIL}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;

/** Social profiles for the footer, in display order. Entries with an empty href are hidden. */
export const SOCIAL_LINKS: { label: string; href: string }[] = [
  { label: "Facebook", href: FACEBOOK_URL },
];
