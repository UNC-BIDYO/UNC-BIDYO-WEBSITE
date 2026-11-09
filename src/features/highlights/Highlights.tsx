import { useState } from "react";
import { usePrefersReducedMotion } from "@/shared/hooks/usePrefersReducedMotion";
import { SIZES } from "@/shared/lib/unsplash";
import { Button } from "@/shared/ui/Button";
import { Container } from "@/shared/ui/Container";
import { PlayPauseIcon } from "@/shared/ui/icons";
import { SectionHead } from "@/shared/ui/SectionHead";
import { CyclingTile } from "./CyclingTile";

const tiles = [
  {
    label: "Live events",
    caption: "Concerts & festivals",
    interval: 4500,
    delay: 0,
    sizes: SIZES.twoThirds,
    className: "aspect-[4/3] md:col-span-4 md:row-span-2 md:aspect-auto",
    photos: [
      "1459749411175-04bf5292ceea",
      "1524368535928-5b5e00ddc76b",
      "1501386761578-eac5c94b800a",
    ],
  },
  {
    label: "Weddings",
    caption: "Ceremonies & portraits",
    interval: 5000,
    delay: 1200,
    sizes: SIZES.third,
    className: "aspect-[4/5] md:col-span-2 md:row-span-2 md:aspect-auto",
    photos: [
      "1537633468298-d86f0c2d4173",
      "1597955750667-3c4fc0c80c97",
      "1630526720753-aa4e71acf67d",
      "1652950618856-2f19ae98297c",
    ],
  },
  {
    label: "Video",
    caption: "On set with the crew",
    interval: 5200,
    delay: 2400,
    sizes: SIZES.third,
    className: "aspect-[4/3] md:col-span-2 md:aspect-auto",
    photos: ["1632187981988-40f3cbaeef5e", "1611784728558-6c7d9b409cdf"],
  },
  {
    label: "Crowds",
    caption: "Atmosphere & moments",
    interval: 4800,
    delay: 3400,
    sizes: SIZES.third,
    className: "aspect-[4/3] md:col-span-2 md:aspect-auto",
    photos: [
      "1533174072545-7a4b6ad7a6c3",
      "1540039155733-5bb30b53aa14",
      "1514525253161-7a46d19cd819",
    ],
  },
  {
    label: "Gear",
    caption: "Shot on pro cameras",
    interval: 5400,
    delay: 600,
    sizes: SIZES.third,
    className: "aspect-[4/3] md:col-span-2 md:aspect-auto",
    photos: ["1535540878298-a155c6d065ef", "1629756048377-09540f52caa1"],
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
            intro="Selected coverage from the past season."
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
          {tiles.map((t) => (
            <CyclingTile key={t.label} {...t} paused={paused} />
          ))}
        </div>
      </Container>
    </section>
  );
}
