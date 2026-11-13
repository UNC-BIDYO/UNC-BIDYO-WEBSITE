import { useEffect, useRef, useState, type FormEvent } from "react";
import { services } from "@/features/services/serviceList";
import { CONTACT_EMAIL, FORM_ENDPOINT, mailto } from "@/shared/lib/site";
import { Button, ButtonLink } from "@/shared/ui/Button";
import { Container } from "@/shared/ui/Container";
import { ArrowIcon } from "@/shared/ui/icons";
import { SelectField, TextAreaField, TextField } from "@/shared/ui/Field";
import { SectionHead } from "@/shared/ui/SectionHead";
import { useRequestedService } from "./bookingIntent";

type Status = "idle" | "sending" | "sent" | "error";

export function Booking() {
  return (
    <section
      id="book"
      data-surface="dark"
      className="bg-ink py-section text-white"
      aria-labelledby="book-title"
    >
      <Container className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div>
          <SectionHead
            id="book-title"
            index="06"
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
        {FORM_ENDPOINT ? (
          <BookingForm endpoint={FORM_ENDPOINT} />
        ) : (
          <div className="self-end">
            <ButtonLink href={mailto("Event booking")} size="lg">
              Email us your event <ArrowIcon />
            </ButtonLink>
          </div>
        )}
      </Container>
    </section>
  );
}

/* Progressive enhancement: without JavaScript this is a normal form POST to Formspree, which
   shows its own confirmation page. With JavaScript it submits in place and reports the result. */
function BookingForm({ endpoint }: { endpoint: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const statusRef = useRef<HTMLParagraphElement>(null);

  // A "Book now" link on a service panel preselects that service.
  const requested = useRequestedService();
  const [service, setService] = useState("");
  const [seen, setSeen] = useState(requested);
  if (requested !== seen) {
    setSeen(requested);
    setService(requested);
  }

  useEffect(() => {
    if (status === "sent" || status === "error") statusRef.current?.focus();
  }, [status]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setStatus("sending");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`Formspree responded ${res.status}`);
      form.reset();
      setService("");
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form action={endpoint} method="POST" onSubmit={onSubmit} className="grid gap-6 sm:grid-cols-2">
      <input type="hidden" name="_subject" value="New booking request (website)" />
      {/* Spam trap: hidden from people, filled in by bots. Formspree drops those submissions. */}
      <input
        type="text"
        name="_gotcha"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="hidden"
      />

      <TextField tone="dark" label="Name" name="name" autoComplete="name" />
      <TextField tone="dark" label="Email" name="email" type="email" autoComplete="email" />
      <TextField
        tone="dark"
        label="Organization or office"
        name="organization"
        autoComplete="organization"
        optional
      />
      <SelectField
        tone="dark"
        label="Service"
        name="service"
        value={service}
        onChange={(e) => setService(e.target.value)}
      >
        <option value="" disabled>
          Choose a service
        </option>
        {services.map((s) => (
          <option key={s.slug} value={s.title}>
            {s.title}
          </option>
        ))}
        <option value="Other">Other / not sure</option>
      </SelectField>
      <TextField tone="dark" label="Event date" name="date" type="date" />
      <TextField tone="dark" label="Venue" name="venue" optional />
      <TextAreaField
        tone="dark"
        label="Details"
        name="message"
        hint="What's the event, roughly what time, and what would you like covered?"
        className="sm:col-span-2"
      />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-4 sm:col-span-2">
        <Button type="submit" size="lg" disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : "Send request"} <ArrowIcon />
        </Button>
        <p ref={statusRef} tabIndex={-1} role="status" className="outline-none">
          {status === "sent" && "Thanks! We got your request and will reply by email."}
          {status === "error" && (
            <span className="text-accent-bright">
              That didn't go through. Try again, or email{" "}
              <a href={mailto("Event booking")} className="underline underline-offset-4">
                {CONTACT_EMAIL}
              </a>
              .
            </span>
          )}
        </p>
      </div>
    </form>
  );
}
