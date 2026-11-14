import { CONTACT_EMAIL, mailto } from "@/shared/lib/site";
import { Container } from "@/shared/ui/Container";
import { SectionHead } from "@/shared/ui/SectionHead";
import { BookingForm } from "./BookingForm";

export function Booking() {
  return (
    <section
      id="book"
      data-surface="dark"
      className="bg-ink py-section text-white"
      aria-labelledby="book-title"
    >
      <Container className="grid gap-12 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
        <div>
          <SectionHead
            id="book-title"
            index="07"
            eyebrow="Book us"
            title="Tell us about your event"
            intro="Send the details and we'll reply by email to confirm coverage."
            tone="dark"
          />
          <p className="mt-8 text-muted-dark">
            Prefer email?{" "}
            <a
              href={mailto("Event booking")}
              className="text-white underline decoration-accent-bright decoration-2 underline-offset-4 hover:text-accent-bright"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>
        <BookingForm />
      </Container>
    </section>
  );
}
