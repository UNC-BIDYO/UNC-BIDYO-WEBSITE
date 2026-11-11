import { useCallback, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { usePrefersReducedMotion } from "@/shared/hooks/usePrefersReducedMotion";
import { cx } from "@/shared/lib/cx";
import { Button } from "@/shared/ui/Button";
import { Container } from "@/shared/ui/Container";
import { ArrowIcon } from "@/shared/ui/icons";
import { SectionHead } from "@/shared/ui/SectionHead";
import { MemberCard } from "./MemberCard";
import { members } from "./members";

export function Team() {
  // Hidden until the officer list in members.ts has someone in it.
  if (members.length === 0) return null;
  return <TeamCarousel />;
}

function TeamCarousel() {
  const track = useRef<HTMLDivElement>(null);
  // `leftmost` is the first slide in view; arrows step from it. `atEnd` is true once the
  // track can't scroll further: the last slides then share the view, so the indicator shows
  // the final member while ← still steps back from the leftmost one.
  const [leftmost, setLeftmost] = useState(0);
  const [atEnd, setAtEnd] = useState(false);
  const active = atEnd ? members.length - 1 : leftmost;
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
    setLeftmost(best);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
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

  const prevNext = (className: string, middle?: ReactNode) => (
    <div className={cx("items-center gap-3", className)}>
      <Button
        variant="outline"
        size="icon"
        onClick={() => goTo(leftmost - 1)}
        disabled={leftmost === 0}
        aria-label="Previous member"
      >
        <ArrowIcon dir="left" />
      </Button>
      {middle}
      <Button
        variant="outline"
        size="icon"
        onClick={() => goTo(leftmost + 1)}
        disabled={atEnd}
        aria-label="Next member"
      >
        <ArrowIcon />
      </Button>
    </div>
  );

  return (
    // No top padding: Highlights above shares this background, so its bottom padding already
    // provides the one section gap (py on both would double it to ~18rem).
    <section className="py-section" aria-roledescription="carousel" aria-label="Our team">
      <Container>
        <div className="flex items-end justify-between gap-6">
          <SectionHead index="04" eyebrow="The team" title="The people behind the camera" />
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
              key={m.photo}
              role="group"
              aria-roledescription="slide"
              aria-label={`${m.name}, ${n + 1} of ${members.length}`}
              className="w-[72%] shrink-0 snap-start sm:w-[44%] md:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-3rem)/4)]"
            >
              <MemberCard member={m} index={n} current={n === active} />
            </div>
          ))}
        </div>
        {/* Phones: arrows with a "03 / 16" counter (a row of 16 dashes would overflow). */}
        {prevNext(
          "mt-10 flex justify-center md:hidden",
          <span
            aria-hidden
            className="min-w-20 text-center font-mono text-xs tabular-nums tracking-[0.16em] text-muted"
          >
            {String(active + 1).padStart(2, "0")} / {String(members.length).padStart(2, "0")}
          </span>,
        )}
        {/* Wider screens: one dash per member. */}
        <div
          className="mt-10 hidden justify-center gap-1 md:flex"
          role="group"
          aria-label="Choose member"
        >
          {members.map((m, n) => (
            <button
              key={m.photo}
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
