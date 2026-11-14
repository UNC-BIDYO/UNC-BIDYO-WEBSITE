import { useState, type MouseEvent, type PointerEvent } from "react";
import { requestBooking } from "@/features/booking/bookingIntent";
import { useHydrated } from "@/shared/hooks/useHydrated";
import { usePrefersReducedMotion } from "@/shared/hooks/usePrefersReducedMotion";
import { cn } from "@/shared/lib/utils";
import { ButtonLink } from "@/shared/ui/Button";
import { Container } from "@/shared/ui/Container";
import { ArrowIcon } from "@/shared/ui/icons";
import { SectionHead } from "@/shared/ui/SectionHead";
import { photoFor, services, type Service } from "./serviceList";

/* An open panel is at most ~640px wide on desktop; full width on phones. */
const SIZES = "(min-width: 1152px) 640px, (min-width: 768px) 56vw, 100vw";
const EASE = "motion-safe:ease-[cubic-bezier(0.2,0.7,0.2,1)]";

export function Services() {
  const [open, setOpen] = useState<number | null>(null);
  const reduced = usePrefersReducedMotion();
  const hydrated = useHydrated();

  return (
    <section
      data-surface="dark"
      className="bg-ink py-section text-white"
      aria-labelledby="services-title"
    >
      <Container>
        <SectionHead
          id="services-title"
          index="01"
          eyebrow="Services"
          title="What we do"
          intro="Open a service to see what's included, then book it below."
          tone="dark"
        />
        <ul
          className="mt-12 flex flex-col gap-4 md:h-[34rem] md:flex-row md:gap-5"
          onPointerLeave={(e) => e.pointerType === "mouse" && setOpen(null)}
        >
          {services.map((service, n) => (
            <ServicePanel
              key={service.slug}
              service={service}
              index={n}
              open={open === n}
              dimmed={open !== null && open !== n}
              reduced={reduced}
              hydrated={hydrated}
              onHover={() => setOpen(n)}
              onToggle={() => setOpen((o) => (o === n ? null : n))}
            />
          ))}
        </ul>
      </Container>
    </section>
  );
}

type ServicePanelProps = {
  service: Service;
  index: number;
  open: boolean;
  dimmed: boolean;
  reduced: boolean;
  /** Before hydration the details are left un-inert, so they work without JavaScript. */
  hydrated: boolean;
  onHover: () => void;
  onToggle: () => void;
};

function ServicePanel({
  service,
  index,
  open,
  dimmed,
  reduced,
  hydrated,
  onHover,
  onToggle,
}: ServicePanelProps) {
  const photo = photoFor(service.slug);
  const detailsId = `service-details-${service.slug}`;
  const number = String(index + 1).padStart(2, "0");

  // Spotlight that follows the cursor (mouse only; skipped with reduced motion).
  const onPointerMove = (e: PointerEvent<HTMLLIElement>) => {
    if (reduced || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--x", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--y", `${e.clientY - r.top}px`);
  };

  // A mouse click on a hovered (already open) panel keeps it open; taps and Enter toggle.
  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    const pointerType = (e.nativeEvent as globalThis.PointerEvent).pointerType;
    if (pointerType === "mouse" && open) return;
    onToggle();
  };

  return (
    <li
      onPointerEnter={(e) => e.pointerType === "mouse" && onHover()}
      onPointerMove={onPointerMove}
      className={cn(
        "group relative isolate flex min-h-80 flex-col justify-end overflow-hidden bg-ink-2 md:min-h-0 md:basis-0",
        open ? "md:grow-[2.6]" : "md:grow",
        dimmed && "md:opacity-60",
        "motion-safe:transition-[flex-grow,opacity] motion-safe:duration-700",
        EASE,
      )}
    >
      {photo && (
        <img
          src={photo.src}
          srcSet={photo.srcSet}
          sizes={SIZES}
          alt=""
          loading="lazy"
          decoding="async"
          className={cn(
            "absolute inset-0 -z-10 h-full w-full object-cover",
            open ? "scale-[1.06]" : "scale-100",
            "motion-safe:transition-transform motion-safe:duration-[1200ms]",
            EASE,
          )}
        />
      )}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-t from-black/95 via-black/50 to-black/10"
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(28rem_circle_at_var(--x,50%)_var(--y,70%),rgba(236,98,102,0.3),transparent_60%)]",
          open ? "opacity-100" : "opacity-0",
          "motion-safe:transition-opacity motion-safe:duration-500",
        )}
      />

      <div className="p-6 sm:p-7">
        <p
          aria-hidden
          className="font-mono text-xs font-medium tracking-[0.2em] text-accent-bright"
        >
          {number}
        </p>
        <h3 className="mt-2 font-display text-4xl uppercase leading-[0.95] lg:text-5xl">
          {/* The button's ::after covers the whole panel, so a tap anywhere toggles it. */}
          <button
            type="button"
            aria-expanded={open}
            aria-controls={detailsId}
            onClick={onClick}
            className="flex w-full items-start justify-between gap-4 text-left after:absolute after:inset-0"
          >
            <span>{service.title}</span>
            <span
              aria-hidden
              className={cn(
                "mt-1 grid h-8 w-8 shrink-0 place-items-center border border-white/50 font-sans text-xl leading-none",
                open && "rotate-45 border-accent-bright text-accent-bright",
                "motion-safe:transition-transform motion-safe:duration-500",
              )}
            >
              +
            </span>
          </button>
        </h3>
        <p className="mt-3 max-w-md leading-relaxed text-white">{service.summary}</p>

        {/* Collapsible details: grid rows animate 0fr → 1fr; `inert` keeps hidden links out of Tab order. */}
        <div
          id={detailsId}
          inert={hydrated && !open}
          data-noscript-open
          className={cn(
            "grid motion-safe:transition-[grid-template-rows] motion-safe:duration-500",
            EASE,
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="overflow-hidden">
            <ul className="mt-5 max-w-md space-y-2 border-t border-white/25 pt-5">
              {service.details.map((d, i) => (
                <li
                  key={d}
                  data-noscript-show
                  style={{ transitionDelay: open ? `${150 + i * 70}ms` : "0ms" }}
                  className={cn(
                    "flex gap-3 text-sm text-white",
                    open ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
                    "motion-safe:transition-[opacity,transform] motion-safe:duration-500",
                  )}
                >
                  <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-accent-bright" />
                  {d}
                </li>
              ))}
            </ul>
            <ButtonLink
              href="#book"
              onClick={() => requestBooking(service.title)}
              data-noscript-show
              style={{ transitionDelay: open ? `${150 + service.details.length * 70}ms` : "0ms" }}
              className={cn(
                "relative z-10 mt-6",
                open ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
                "motion-safe:transition-[opacity,transform,background-color] motion-safe:duration-500",
              )}
            >
              Book now <ArrowIcon />
            </ButtonLink>
          </div>
        </div>
      </div>
    </li>
  );
}
