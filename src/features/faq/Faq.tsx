import { useId, useState } from "react";
import { useHydrated } from "@/shared/hooks/useHydrated";
import { cn } from "@/shared/lib/utils";
import { Container } from "@/shared/ui/Container";
import { SectionHead } from "@/shared/ui/SectionHead";
import { faqs } from "./faqList";

const EASE = "motion-safe:ease-[cubic-bezier(0.2,0.7,0.2,1)]";

/* Disclosure buttons (aria-expanded) with a grid-rows tween, the same pattern as Services.
   The answer is `inert` while closed once hydrated; before that it stays reachable so the
   page works without JavaScript. */
export function Faq() {
  if (faqs.length === 0) return null;
  return (
    <section className="pb-section" aria-labelledby="faq-title">
      <Container className="grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
        <SectionHead id="faq-title" index="06" eyebrow="FAQ" title="Before you book" />
        <div className="border-t border-line-strong">
          {faqs.map((f) => (
            <FaqItem key={f.question} item={f} />
          ))}
        </div>
      </Container>
    </section>
  );
}

function FaqItem({ item }: { item: (typeof faqs)[number] }) {
  const [open, setOpen] = useState(false);
  const hydrated = useHydrated();
  const id = useId();
  return (
    <div className="border-b border-line-strong">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((o) => !o)}
          className="flex w-full cursor-pointer items-center justify-between gap-6 py-6 text-left"
        >
          <span className="font-display text-2xl uppercase leading-tight sm:text-3xl">
            {item.question}
          </span>
          <span
            aria-hidden
            className={cn(
              "grid h-8 w-8 shrink-0 place-items-center border text-xl leading-none",
              open ? "border-accent text-accent" : "border-line-strong",
              "motion-safe:transition-colors motion-safe:duration-500",
            )}
          >
            <span
              className={cn(
                "block leading-none motion-safe:transition-transform motion-safe:duration-500",
                EASE,
                open && "rotate-45",
              )}
            >
              +
            </span>
          </span>
        </button>
      </h3>
      <div
        id={id}
        inert={hydrated && !open}
        data-noscript-open
        className={cn(
          "grid motion-safe:transition-[grid-template-rows] motion-safe:duration-500",
          EASE,
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <p className="max-w-2xl pb-7 text-lg leading-relaxed text-muted">{item.answer}</p>
        </div>
      </div>
    </div>
  );
}
