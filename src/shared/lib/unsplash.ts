export const img = (id: string, w = 1000) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&q=75&w=${w}`;

/* Unsplash resizes from the URL, so each photo is offered at several widths
   and the browser picks the smallest that fills its slot (`sizes`). */
const WIDTHS = [400, 640, 960, 1280, 1600];
export const srcSet = (id: string) => WIDTHS.map((w) => `${img(id, w)} ${w}w`).join(", ");

/* Common slot widths. On md+ the grids are 6 columns inside a max-w-6xl (1152px) container. */
export const SIZES = {
  full: "100vw",
  twoThirds: "(min-width: 1152px) 720px, (min-width: 768px) 64vw, 100vw",
  third: "(min-width: 1152px) 360px, (min-width: 768px) 32vw, 100vw",
} as const;
