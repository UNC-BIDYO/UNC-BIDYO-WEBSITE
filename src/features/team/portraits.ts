export type Portrait = { src: string; srcSet: string };

/* Transparent PNG cutouts, resized at build time by vite-imagetools.
   WebP keeps the transparency, so the card background shows through.
   Glob patterns must be literal strings, so the two lists repeat the same pattern. */
const srcSets = import.meta.glob<string>("./portraits/*.png", {
  query: { w: "320;480;640;800", format: "webp", withoutEnlargement: "", as: "srcset" },
  import: "default",
  eager: true,
});
const srcs = import.meta.glob<string>("./portraits/*.png", {
  query: { w: "640", format: "webp", withoutEnlargement: "" },
  import: "default",
  eager: true,
});

const portrait = (file: string): Portrait | undefined =>
  srcs[file] ? { src: srcs[file], srcSet: srcSets[file] } : undefined;

const warned = new Set<number>();

/** The main (<n>.png) and hover (<n>.1.png) portraits for a member; either may be missing. */
export function portraitsFor(photo: number) {
  const main = portrait(`./portraits/${photo}.png`);
  const hover = portrait(`./portraits/${photo}.1.png`);
  if (import.meta.env.DEV && !main && !warned.has(photo)) {
    warned.add(photo);
    console.warn(`Team: no portraits/${photo}.png, so member ${photo} shows initials instead.`);
  }
  return { main, hover };
}
