import { Container } from "@/shared/ui/Container";
import { SectionHead } from "@/shared/ui/SectionHead";
import { faqs } from "./faqList";

/* Native <details>/<summary>: keyboard and screen-reader support built in, and it works
   without JavaScript. */
export function Faq() {
  if (faqs.length === 0) return null;
  return (
    <section className="pb-section" aria-labelledby="faq-title">
      <Container className="grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
        <SectionHead id="faq-title" index="05" eyebrow="FAQ" title="Before you book" />
        <div className="border-t border-line-strong">
          {faqs.map((f) => (
            <details key={f.question} className="group border-b border-line-strong">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-6 [&::-webkit-details-marker]:hidden">
                <span className="font-display text-2xl uppercase leading-tight sm:text-3xl">
                  {f.question}
                </span>
                <span
                  aria-hidden
                  className="mt-1 grid h-8 w-8 shrink-0 place-items-center border border-line-strong text-xl leading-none group-open:rotate-45 group-open:border-accent group-open:text-accent motion-safe:transition-transform motion-safe:duration-300"
                >
                  +
                </span>
              </summary>
              <p className="max-w-2xl pb-7 text-lg leading-relaxed text-muted">{f.answer}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
