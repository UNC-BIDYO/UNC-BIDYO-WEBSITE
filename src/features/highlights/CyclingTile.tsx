import { useEffect, useState } from "react";
import { cx } from "@/shared/lib/cx";
import type { Photo } from "./photos";

type CyclingTileProps = {
  photos: Photo[];
  sizes: string;
  label: string;
  caption: string;
  interval: number;
  delay: number;
  className: string;
  paused: boolean;
};

export function CyclingTile({
  photos,
  sizes,
  label,
  caption,
  interval,
  delay,
  className,
  paused,
}: CyclingTileProps) {
  const [i, setI] = useState(0);
  const [hovered, setHovered] = useState(false);
  // Photo 1 loads lazily with the tile. Each later photo is fetched one step ahead of being shown,
  // so a tile never downloads its whole set up front (or at all, while paused).
  const [firstLoaded, setFirstLoaded] = useState(false);
  const [furthest, setFurthest] = useState(0);
  if (i > furthest) setFurthest(i);
  const stopped = paused || hovered;
  const shouldRender = (n: number) =>
    n === 0 || n <= furthest || (firstLoaded && !paused && n === furthest + 1);

  useEffect(() => {
    if (stopped || photos.length < 2) return;
    let timer: number | undefined;
    const start = window.setTimeout(() => {
      timer = window.setInterval(() => setI((n) => (n + 1) % photos.length), interval);
    }, delay);
    return () => {
      clearTimeout(start);
      clearInterval(timer);
    };
  }, [photos.length, interval, delay, stopped]);

  return (
    <figure
      className={cx("relative overflow-hidden bg-ink", className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* The visible caption names the tile; the rotating photos are illustrative. */}
      {photos.map((photo, n) =>
        shouldRender(n) ? (
          <img
            key={photo.src}
            src={photo.src}
            srcSet={photo.srcSet}
            sizes={sizes}
            alt=""
            loading="lazy"
            decoding="async"
            onLoad={n === 0 ? () => setFirstLoaded(true) : undefined}
            className={cx(
              "absolute inset-0 h-full w-full object-cover transition-opacity duration-[1600ms] ease-in-out",
              n === i ? "opacity-100" : "opacity-0",
            )}
          />
        ) : null,
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
      <figcaption className="absolute bottom-0 left-0 p-5 text-white sm:p-6">
        <span className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-white">
          {label}
        </span>
        <p className="mt-1 font-display text-2xl uppercase leading-none sm:text-3xl">{caption}</p>
      </figcaption>
    </figure>
  );
}
