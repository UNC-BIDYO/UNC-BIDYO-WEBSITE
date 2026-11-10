export type Member = {
  /** Portrait number: portraits/<photo>.png, and portraits/<photo>.1.png on hover. */
  photo: number;
  name: string;
  role: string;
};

/* The officers shown in the Team carousel, in display order.
   Add one line per person; see portraits/README.md for the photo files. */
export const members: Member[] = [
  { photo: 1, name: "Arturo “Junie” Orante Jr.", role: "Adviser" },
  { photo: 2, name: "Vincent Olpate", role: "Co-Adviser" },
  { photo: 3, name: "Gian Allen S. Ong", role: "President" },
  { photo: 4, name: "Mike Angel Barbecho", role: "Internal Vice President" },
  { photo: 5, name: "Yohance Lumanta", role: "External Vice President" },
  { photo: 6, name: "Julia Beatrice E. Sanchez", role: "Secretary" },
  { photo: 7, name: "Jannele Rose C. Claro", role: "Treasurer" },
  { photo: 8, name: "Phoenixander B. Perez", role: "Documentation Head" },
  { photo: 9, name: "Maddox Dimitri B. Sacayan", role: "Asst. Documentation Head" },
  { photo: 10, name: "Ellyza Jade A. Barba", role: "Creative Head" },
  { photo: 11, name: "Felicity Zoe A. Amado", role: "Asst. Creative Head" },
  { photo: 12, name: "Aeila Danielle M. Deligero", role: "Production Head" },
  { photo: 13, name: "Simon Cean Elizar P. Samillano", role: "Asst. Production Head" },
  { photo: 14, name: "Rovick Domanico", role: "Logistics Head" },
  { photo: 15, name: "Maria Antonia D. Zapanta", role: "Asst. Logistics Head" },
  { photo: 16, name: "Kurt Xean Pasiona", role: "Website Manager" },
];
