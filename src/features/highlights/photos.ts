export type Photo = { src: string; srcSet: string };

/* Every image in ./photos/<tile>/ is resized at build time by vite-imagetools
   into five WebP widths (the srcset) plus a 960px version (the src).
   Glob patterns must be literal strings, so the two lists repeat the same pattern. */
const srcSets = import.meta.glob<string>("./photos/*/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG}", {
  query: { w: "400;640;960;1280;1600", format: "webp", withoutEnlargement: "", as: "srcset" },
  import: "default",
  eager: true,
});
const srcs = import.meta.glob<string>("./photos/*/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG}", {
  query: { w: "960", format: "webp", withoutEnlargement: "" },
  import: "default",
  eager: true,
});

// Group by folder, ordered by file name ("1-…", "2-…", "10-…": natural number order).
const byFolder = new Map<string, Photo[]>();
for (const file of Object.keys(srcs).sort((a, b) =>
  a.localeCompare(b, undefined, { numeric: true }),
)) {
  const folder = file.split("/")[2];
  const list = byFolder.get(folder) ?? [];
  list.push({ src: srcs[file], srcSet: srcSets[file] });
  byFolder.set(folder, list);
}

/** The photos in ./photos/<folder>/, in file-name order (empty if the folder has none). */
export function photosFor(folder: string): Photo[] {
  const photos = byFolder.get(folder) ?? [];
  // Warn during development only: in production an empty tile is hidden, never a crash.
  if (import.meta.env.DEV && photos.length === 0) {
    console.warn(`Highlights: no photos in ./photos/${folder}/, so its tile is hidden.`);
  }
  return photos;
}
