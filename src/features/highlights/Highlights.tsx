import { useState } from "react";
import { usePrefersReducedMotion } from "@/shared/hooks/usePrefersReducedMotion";
import { Button } from "@/shared/ui/Button";
import { Container } from "@/shared/ui/Container";
import { PlayPauseIcon } from "@/shared/ui/icons";
import { SectionHead } from "@/shared/ui/SectionHead";
import { CyclingTile } from "./CyclingTile";
import { photosFor } from "./photos";

/* Tile widths for the `sizes` hint: full width on phones; on md+ the grid is 6 columns
   inside a max-w-6xl (1152px) container. */
const SIZES = {
  twoThirds: "(min-width: 1152px) 720px, (min-width: 768px) 64vw, 100vw",
  third: "(min-width: 1152px) 360px, (min-width: 768px) 32vw, 100vw",
} as const;

/* Photos come from ./photos/<folder>/ (see ./photos/README.md). */
const tiles = [
  {
    // Large tile (4 cols × 2 rows): the flagship service.
    label: "Event coverage",
    caption: "Every event, start to finish",
    interval: 4500,
    delay: 0,
    sizes: SIZES.twoThirds,
    className: "aspect-[4/3] md:col-span-4 md:row-span-2 md:aspect-auto",
    photos: photosFor("event-coverage"),
  },
  {
    // Tall tile: suits portrait-orientation shots.
    label: "Portraits",
    caption: "Captured with intent",
    interval: 5000,
    delay: 1200,
    sizes: SIZES.third,
    className: "aspect-[4/5] md:col-span-2 md:row-span-2 md:aspect-auto",
    photos: photosFor("portraits"),
  },
  {
    label: "Crowd candids",
    caption: "The moments in between",
    interval: 4800,
    delay: 2400,
    sizes: SIZES.third,
    className: "aspect-[4/3] md:col-span-2 md:aspect-auto",
    photos: photosFor("crowd-candids"),
  },
  {
    label: "Attention to detail",
    caption: "Nothing too small",
    interval: 5400,
    delay: 3400,
    sizes: SIZES.third,
    className: "aspect-[4/3] md:col-span-2 md:aspect-auto",
    photos: photosFor("details"),
  },
  {
    label: "Behind the lens",
    caption: "The crew at work",
    interval: 5200,
    delay: 600,
    sizes: SIZES.third,
    className: "aspect-[4/3] md:col-span-2 md:aspect-auto",
    photos: photosFor("behind-the-lens"),
  },
];

export function Highlights() {
  const reduced = usePrefersReducedMotion();
  const [userPaused, setUserPaused] = useState(false);
  const paused = reduced || userPaused;

  return (
    <section className="py-section" aria-labelledby="work-title">
      <Container>
        <div className="flex items-end justify-between gap-6">
          <SectionHead
            id="work-title"
            index="02"
            eyebrow="Recent work"
            title="A look at what we deliver"
            intro="Selected coverage from this year."
          />
          {!reduced && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setUserPaused((p) => !p)}
              aria-label={userPaused ? "Play slideshow" : "Pause slideshow"}
            >
              <PlayPauseIcon playing={!userPaused} />
            </Button>
          )}
        </div>
        <div className="mt-12 grid grid-cols-1 gap-3 md:auto-rows-[15rem] md:grid-cols-6 md:gap-4">
          {tiles
            .filter((t) => t.photos.length > 0)
            .map((t) => (
              <CyclingTile key={t.label} {...t} paused={paused} />
            ))}
        </div>
      </Container>
    </section>
  );
}
