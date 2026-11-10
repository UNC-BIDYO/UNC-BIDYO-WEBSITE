import { groupByFolder, type Photo } from "@/shared/lib/photoFolders";

export type Service = {
  /** Matches the photo folder: ./photos/<slug>/ (the first image by file name is used). */
  slug: string;
  title: string;
  /** Always visible. */
  summary: string;
  /** Revealed when the panel expands. */
  details: string[];
};

/* DRAFT COPY: the details below are general descriptions, not commitments.
   Replace them with what Bidyo actually includes (turnaround, team size, deliverables). */
export const services: Service[] = [
  {
    slug: "event-coverage",
    title: "Event Coverage",
    summary: "Photo and video documentation of school events, from programs to parades.",
    details: [
      "Photographers and videographers on site",
      "Edited photo gallery after the event",
      "Highlight posts ready for your page",
    ],
  },
  {
    slug: "photoshoots",
    title: "Photoshoots",
    summary: "Planned portrait sessions for officers, orgs, graduates and profiles.",
    details: [
      "Shot list planned with you",
      "Individual and group portraits",
      "Edited, ready-to-post photos",
    ],
  },
  {
    slug: "video-production",
    title: "Video Production",
    summary: "Highlight reels, aftermovies, promos and interviews, filmed and edited by us.",
    details: [
      "Concept and shot planning",
      "Filming on the day",
      "Edited video sized for social media",
    ],
  },
];

/* Panel photos: resized at build time by vite-imagetools (literal glob patterns required). */
const srcSets = import.meta.glob<string>("./photos/*/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG}", {
  query: { w: "400;640;960;1280", format: "webp", withoutEnlargement: "", as: "srcset" },
  import: "default",
  eager: true,
});
const srcs = import.meta.glob<string>("./photos/*/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG}", {
  query: { w: "960", format: "webp", withoutEnlargement: "" },
  import: "default",
  eager: true,
});
const byFolder = groupByFolder(srcs, srcSets);

/** The panel photo for a service, or undefined if its folder is empty. */
export function photoFor(slug: string): Photo | undefined {
  const photo = byFolder.get(slug)?.[0];
  if (import.meta.env.DEV && !photo) {
    console.warn(`Services: no photo in ./photos/${slug}/, so the panel has no image.`);
  }
  return photo;
}
