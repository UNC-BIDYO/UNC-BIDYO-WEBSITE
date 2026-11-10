import { useCallback, useRef, useState, type PointerEvent } from "react";
import { usePrefersReducedMotion } from "@/shared/hooks/usePrefersReducedMotion";
import { cx } from "@/shared/lib/cx";
import { img, srcSet } from "@/shared/lib/unsplash";
import { Button } from "@/shared/ui/Button";
import { Container } from "@/shared/ui/Container";
import { ArrowIcon } from "@/shared/ui/icons";
import { SectionHead } from "@/shared/ui/SectionHead";

const members = [
  { name: "Maya Chen", role: "Lead Photographer", photo: "1494790108377-be9c29b29330" },
  { name: "Daniel Okafor", role: "Director of Video", photo: "1507003211169-0a1dd7228f2d" },
  { name: "Elena Rossi", role: "Event Photographer", photo: "1607503873903-c5e95f80d7b9" },
  { name: "Jonas Weber", role: "Cinematographer", photo: "1500648767791-00dcc994a43e" },
  { name: "Priya Nair", role: "Video Editor", photo: "1609436132311-e4b0c9370469" },
  { name: "Marco Silva", role: "Producer", photo: "1590086782957-93c06ef21604" },
];

export function Team() {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const reduced = usePrefersReducedMotion();

  const onScroll = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const items = Array.from(el.children) as HTMLElement[];
    let best = 0;
    let dist = Infinity;
    items.forEach((c, n) => {
      const d = Math.abs(c.offsetLeft - el.offsetLeft - el.scrollLeft);
      if (d < dist) {
        dist = d;
        best = n;
      }
    });
    if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) best = items.length - 1;
    setActive(best);
  }, []);

  const goTo = (n: number) => {
    const el = track.current;
    if (!el) return;
    const target = el.children[Math.max(0, Math.min(members.length - 1, n))] as HTMLElement;
    el.scrollTo({ left: target.offsetLeft - el.offsetLeft, behavior: reduced ? "auto" : "smooth" });
  };

  // Touch swiping is native (overflow scroll). This adds click-and-drag for mouse users.
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const el = track.current;
    if (!el || e.pointerType !== "mouse" || e.button !== 0) return;
    drag.current = { x: e.clientX, left: el.scrollLeft, moved: false };
    el.style.scrollSnapType = "none";
    el.style.scrollBehavior = "auto";
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = track.current;
    const d = drag.current;
    if (!el || !d) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 4) {
      d.moved = true;
      el.setPointerCapture(e.pointerId);
    }
    if (d.moved) el.scrollLeft = d.left - dx;
  };
  const endDrag = () => {
    const el = track.current;
    const d = drag.current;
    drag.current = null;
    if (!el || !d) return;
    el.style.scrollSnapType = "";
    el.style.scrollBehavior = "";
    if (!d.moved) return;
    // Settle on the nearest slide; a short flick (>40px) still advances one slide.
    const pos = (Array.from(el.children) as HTMLElement[]).map((c) => c.offsetLeft - el.offsetLeft);
    const nearestTo = (x: number) =>
      pos.reduce((best, p, n) => (Math.abs(p - x) < Math.abs(pos[best] - x) ? n : best), 0);
    const start = nearestTo(d.left);
    let target = nearestTo(el.scrollLeft);
    const delta = el.scrollLeft - d.left;
    if (target === start && Math.abs(delta) > 40) target = start + Math.sign(delta);
    goTo(target);
  };

  const prevNext = (className: string) => (
    <div className={cx("gap-3", className)}>
      <Button
        variant="outline"
        size="icon"
        onClick={() => goTo(active - 1)}
        disabled={active === 0}
        aria-label="Previous member"
      >
        <ArrowIcon dir="left" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() => goTo(active + 1)}
        disabled={active === members.length - 1}
        aria-label="Next member"
      >
        <ArrowIcon />
      </Button>
    </div>
  );

  return (
    <section className="py-section" aria-roledescription="carousel" aria-label="Our team">
      <Container>
        <div className="flex items-end justify-between gap-6">
          <SectionHead index="03" eyebrow="The team" title="The people behind the camera" />
          {prevNext("hidden md:flex")}
        </div>
        <div
          ref={track}
          onScroll={onScroll}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
          className="no-scrollbar -mx-5 mt-12 flex cursor-grab select-none snap-x snap-mandatory gap-4 overflow-x-auto px-5 active:cursor-grabbing motion-safe:scroll-smooth sm:-mx-8 sm:px-8"
          style={{ scrollPaddingInline: "1.25rem" }}
        >
          {members.map((m, n) => (
            <div
              key={m.name}
              role="group"
              aria-roledescription="slide"
              aria-label={`${m.name}, ${n + 1} of ${members.length}`}
              className="w-[72%] shrink-0 snap-start sm:w-[44%] md:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-3rem)/4)]"
            >
              <div className="aspect-[4/5] overflow-hidden bg-line">
                <img
                  src={img(m.photo, 640)}
                  srcSet={srcSet(m.photo)}
                  sizes="(min-width: 1024px) 270px, (min-width: 768px) 33vw, (min-width: 640px) 44vw, 72vw"
                  alt={`Portrait of ${m.name}`}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className="h-full w-full object-cover grayscale-[35%] motion-safe:transition-[filter] motion-safe:duration-500 hover:grayscale-0"
                />
              </div>
              <p className="mt-4 font-mono text-xs uppercase tracking-[0.16em] text-muted">
                {String(n + 1).padStart(2, "0")} — {m.role}
              </p>
              <h3 className="mt-1 font-display text-3xl uppercase leading-none">{m.name}</h3>
            </div>
          ))}
        </div>
        {prevNext("mt-10 flex justify-center md:hidden")}
        <div
          className="mt-6 flex justify-center gap-1 md:mt-10"
          role="group"
          aria-label="Choose member"
        >
          {members.map((m, n) => (
            <button
              key={m.name}
              type="button"
              onClick={() => goTo(n)}
              aria-label={`Go to ${m.name}`}
              aria-current={n === active ? "true" : undefined}
              className="group flex h-6 min-w-6 items-center justify-center"
            >
              <span
                aria-hidden
                className={cx(
                  "block h-1 transition-all",
                  n === active ? "w-8 bg-accent" : "w-4 bg-muted group-hover:bg-ink",
                )}
              />
            </button>
          ))}
        </div>
      </Container>
    </section>
  );
}
