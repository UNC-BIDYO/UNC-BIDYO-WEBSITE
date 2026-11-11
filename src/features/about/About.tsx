import { Container } from "@/shared/ui/Container";
import { SectionHead } from "@/shared/ui/SectionHead";
import { about } from "./aboutContent";

export function About() {
  return (
    <section
      data-surface="dark"
      className="bg-accent py-section text-white"
      aria-labelledby="about-title"
    >
      <Container className="grid gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
        <div>
          <SectionHead
            id="about-title"
            index="03"
            eyebrow="About"
            title={about.title}
            tone="accent"
          />
          <div className="mt-6 max-w-xl space-y-4 text-lg leading-relaxed text-white/85">
            {about.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-4 border-t border-white/30 pt-6 lg:grid-cols-1 lg:gap-6 lg:border-t-0 lg:border-l lg:pl-10 lg:pt-0">
          {about.stats.map((s) => (
            <div key={s.label} className="flex flex-col-reverse justify-end">
              <dt className="mt-1 font-mono text-xs uppercase tracking-[0.16em] text-white/85">
                {s.label}
              </dt>
              <dd className="font-display text-4xl leading-none sm:text-6xl">{s.value}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
