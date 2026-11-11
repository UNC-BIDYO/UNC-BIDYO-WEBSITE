import { useEffect, useRef, useState, type FormEvent } from "react";
import { BOOKING_RULES } from "../../../api/book";
import { services } from "@/features/services/serviceList";
import { useHydrated } from "@/shared/hooks/useHydrated";
import { CONTACT_EMAIL, mailto } from "@/shared/lib/site";
import { Button } from "@/shared/ui/Button";
import { Container } from "@/shared/ui/Container";
import { ArrowIcon } from "@/shared/ui/icons";
import { CheckboxField, FileField, SelectField, TextAreaField, TextField } from "@/shared/ui/Field";
import { SectionHead } from "@/shared/ui/SectionHead";
import { useRequestedService } from "./bookingIntent";

/** Vercel function in api/book.ts: saves to Supabase and emails Bidyo. */
const BOOKING_ENDPOINT = "/api/book";

type Status = "idle" | "sending" | "sent" | "error";
type Errors = Record<string, string>;

const LETTER_ACCEPT = Object.keys(BOOKING_RULES.letterTypes)
  .map((ext) => `.${ext}`)
  .join(",");

/** YYYY-MM-DD in the visitor's time zone, `days` from `from` (default today). */
function isoDate(days = 0, from?: string) {
  const d = from ? new Date(`${from}T00:00:00`) : new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA");
}

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
        <BookingForm />
      </Container>
    </section>
  );
}

/* Progressive enhancement: without JavaScript this is a normal multipart form POST, and
   /api/book answers with its own confirmation page. With JavaScript it submits in place,
   shows field errors from the server, and reports the result. */
function BookingForm() {
  const hydrated = useHydrated();
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState("");
  const statusRef = useRef<HTMLParagraphElement>(null);

  // A "Book now" link on a service panel preselects that service.
  const requested = useRequestedService();
  const [service, setService] = useState("");
  const [seen, setSeen] = useState(requested);
  if (requested !== seen) {
    setSeen(requested);
    setService(requested);
  }

  const [start, setStart] = useState("");
  const [multiDay, setMultiDay] = useState(false);

  useEffect(() => {
    if (status === "sent" || status === "error") statusRef.current?.focus();
  }, [status]);

  const fail = (msg: string, fieldErrors: Errors = {}) => {
    setErrors(fieldErrors);
    setMessage(msg);
    setStatus("error");
  };

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    // Check the letter here too, so a too-big file fails fast instead of after uploading.
    const letter = data.get("letter");
    if (letter instanceof File && letter.size > 0) {
      const ext = letter.name.split(".").pop()?.toLowerCase() ?? "";
      if (!(ext in BOOKING_RULES.letterTypes)) {
        return fail("Check the highlighted field.", {
          letter: "Upload a PDF, Word document, JPG or PNG.",
        });
      }
      if (letter.size > BOOKING_RULES.letterMaxBytes) {
        return fail("Check the highlighted field.", {
          letter: "The letter must be 4 MB or smaller.",
        });
      }
    }

    setStatus("sending");
    setErrors({});
    try {
      const res = await fetch(BOOKING_ENDPOINT, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
      });
      const body = (await res.json().catch(() => null)) as {
        ok?: boolean;
        errors?: Errors;
        message?: string;
      } | null;
      if (res.ok && body?.ok) {
        form.reset();
        setService("");
        setStart("");
        setMultiDay(false);
        setStatus("sent");
        return;
      }
      // The server's `message` is written for the no-JavaScript page; here the line below says it.
      if (body?.errors) return fail("Check the highlighted fields.", body.errors);
      fail("That didn't go through.");
    } catch {
      fail("That didn't go through.");
    }
  }

  const tone = "dark" as const;
  return (
    <form
      action={BOOKING_ENDPOINT}
      method="POST"
      encType="multipart/form-data"
      onSubmit={onSubmit}
      className="grid gap-x-6 gap-y-7 sm:grid-cols-2"
    >
      {/* Spam trap: hidden from people, filled in by bots. The server drops those requests. */}
      <input
        type="text"
        name="_gotcha"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="hidden"
      />

      <TextField
        tone={tone}
        label="Name"
        name="name"
        autoComplete="name"
        maxLength={BOOKING_RULES.maxLength.name}
        error={errors.name}
      />
      <TextField
        tone={tone}
        label="Organization"
        name="organization"
        autoComplete="organization"
        maxLength={BOOKING_RULES.maxLength.organization}
        error={errors.organization}
      />
      <TextField
        tone={tone}
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        hint="UNC email (@unc.edu.ph) preferred"
        maxLength={BOOKING_RULES.maxLength.email}
        error={errors.email}
      />
      <TextField
        tone={tone}
        label="Mobile number"
        name="mobile"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        hint="e.g. 0917 123 4567"
        pattern={BOOKING_RULES.mobilePattern}
        title="A Philippine mobile number, like 0917 123 4567"
        maxLength={BOOKING_RULES.maxLength.mobile}
        error={errors.mobile}
      />
      <TextField
        tone={tone}
        label="Activity / event title"
        name="event_title"
        maxLength={BOOKING_RULES.maxLength.event_title}
        error={errors.event_title}
      />
      <SelectField
        tone={tone}
        label="Service"
        name="service"
        value={service}
        onChange={(e) => setService(e.target.value)}
        error={errors.service}
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

      {/* The last-day field is shown by CSS when the box is ticked, so it works without
          JavaScript too; with JavaScript it also becomes required and can't precede day 2. */}
      <fieldset className="group/dates grid gap-x-6 gap-y-4 sm:col-span-2 sm:grid-cols-2">
        <legend className="sr-only">Event dates</legend>
        <TextField
          tone={tone}
          label={multiDay ? "First day" : "Event date"}
          name="start_date"
          type="date"
          min={hydrated ? isoDate() : undefined}
          value={start}
          onChange={(e) => setStart(e.target.value)}
          error={errors.start_date}
        />
        <TextField
          tone={tone}
          label="Last day"
          name="end_date"
          type="date"
          className="hidden group-has-[:checked]/dates:block"
          required={hydrated && multiDay}
          min={hydrated ? isoDate(1, start || undefined) : undefined}
          error={errors.end_date}
        />
        <CheckboxField
          tone={tone}
          label="Multi-day event (2 days or more)"
          name="multiday"
          value="yes"
          checked={multiDay}
          onChange={(e) => setMultiDay(e.target.checked)}
          className="sm:col-span-2"
        />
      </fieldset>

      <TextField
        tone={tone}
        label="Event place"
        name="venue"
        maxLength={BOOKING_RULES.maxLength.venue}
        error={errors.venue}
      />
      <TextField
        tone={tone}
        label="Number of shooters"
        name="shooters"
        type="number"
        inputMode="numeric"
        min={BOOKING_RULES.shooters.min}
        max={BOOKING_RULES.shooters.max}
        step={1}
        error={errors.shooters}
      />
      <TextAreaField
        tone={tone}
        label="Additional requests"
        name="requests"
        optional
        rows={4}
        maxLength={BOOKING_RULES.maxLength.requests}
        className="sm:col-span-2"
        error={errors.requests}
      />
      <FileField
        tone={tone}
        label="Formal letter"
        name="letter"
        optional
        accept={LETTER_ACCEPT}
        hint="If you have one: PDF, Word, JPG or PNG, up to 4 MB."
        className="sm:col-span-2"
        error={errors.letter}
      />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-4 sm:col-span-2">
        <Button type="submit" size="lg" disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : "Send request"} <ArrowIcon />
        </Button>
        <p ref={statusRef} tabIndex={-1} role="status" className="outline-none">
          {status === "sent" && "Thanks! We got your request and will reply by email."}
          {status === "error" && (
            <span className="text-accent-bright">
              {message} Try again, or email{" "}
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
