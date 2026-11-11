export const BRAND = "UNC Bidyo";

export const CONTACT_EMAIL = "uncbidyoorg@gmail.com";

export const mailto = (subject?: string) =>
  `mailto:${CONTACT_EMAIL}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;

/** Formspree endpoint for the booking form, e.g. "https://formspree.io/f/abcdwxyz".
    Create the form at formspree.io with the contact email above. While this is empty, the
    booking section shows the email address instead of the form. */
export const FORM_ENDPOINT = "";

/** Social profiles for the footer, in display order. Entries with an empty href are hidden. */
export const SOCIAL_LINKS: { label: string; href: string }[] = [
  { label: "Facebook", href: "https://www.facebook.com/UNCBidyo" },
];
