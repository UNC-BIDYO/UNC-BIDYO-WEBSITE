import { img, SIZES, srcSet } from "@/shared/lib/unsplash";
import { Container } from "@/shared/ui/Container";
import { SectionHead } from "@/shared/ui/SectionHead";

const services = [
  {
    title: "Event Coverage",
    text: "Full-day photo and video coverage of conferences, concerts, weddings and parties.",
    photo: "1470229722913-7c0e2dbbafd3",
  },
  {
    title: "Photo Shoot",
    text: "Portraits, brand and team photography, planned with you and retouched for use.",
    photo: "1611550287705-7ff8b459c8eb",
  },
  {
    title: "Video Shoot",
    text: "Highlight reels, promos and interviews, shot in 4K and edited by our team.",
    photo: "1603126004251-d01882b9bfd3",
  },
];

export function Services() {
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
          tone="dark"
        />
        <ul className="mt-12 grid gap-4 md:grid-cols-3 md:gap-5">
          {services.map((s, n) => (
            <li
              key={s.title}
              className="group relative aspect-[4/5] overflow-hidden bg-ink-2 md:aspect-[3/4]"
            >
              <img
                src={img(s.photo, 960)}
                srcSet={srcSet(s.photo)}
                sizes={SIZES.third}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out motion-safe:group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/10" />
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-7">
                <p
                  className="font-mono text-xs font-medium tracking-[0.2em] text-accent-bright"
                  aria-hidden
                >
                  {String(n + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-2 font-display text-4xl uppercase leading-none">{s.title}</h3>
                <p className="mt-3 leading-relaxed text-white">{s.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
