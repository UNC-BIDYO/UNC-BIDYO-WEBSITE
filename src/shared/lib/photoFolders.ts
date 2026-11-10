export type Photo = { src: string; srcSet: string };

/* Shared by features that load photos from `./photos/<folder>/` with import.meta.glob.
   (The globs themselves must stay in each feature: Vite needs literal patterns.) */

/** Groups globbed images by their parent folder, ordered by file name ("1-…", "2-…", "10-…"). */
export function groupByFolder(
  srcs: Record<string, string>,
  srcSets: Record<string, string>,
): Map<string, Photo[]> {
  const byFolder = new Map<string, Photo[]>();
  const files = Object.keys(srcs).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  for (const file of files) {
    const parts = file.split("/");
    const folder = parts[parts.length - 2];
    const list = byFolder.get(folder) ?? [];
    list.push({ src: srcs[file], srcSet: srcSets[file] });
    byFolder.set(folder, list);
  }
  return byFolder;
}
