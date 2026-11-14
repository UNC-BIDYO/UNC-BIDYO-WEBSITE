import { useEffect, useRef, useState, type FormEvent } from "react";
import { BOOKING_RULES } from "@api/rules";
import { useHydrated } from "@/shared/hooks/useHydrated";
import { cn } from "@/shared/lib/utils";
import { CONTACT_EMAIL, mailto } from "@/shared/lib/site";
import { Button } from "@/shared/ui/Button";
import type { DateRangeValue } from "@/shared/ui/DateCalendar";
import { DatePickerField, toIsoDate } from "@/shared/ui/DatePickerField";
import {
  CheckboxField,
  FileField,
  FormSection,
  RequiredNote,
  CheckboxGroupField,
  TextAreaField,
  TextField,
} from "@/shared/ui/Field";
import { ArrowIcon } from "@/shared/ui/icons";
import { useSchedule } from "@/features/schedule/useSchedule";
import { useRequestedService } from "./bookingIntent";
import { Turnstile } from "./Turnstile";

/** Vercel function in api/book.ts: saves to Supabase and emails Bidyo. */
const BOOKING_ENDPOINT = "/api/book";

type Status = "idle" | "sending" | "sent" | "unavailable" | "error";
type Errors = Record<string, string>;

/** The service checkboxes; values are what the server accepts (BOOKING_RULES.services). */
const SERVICE_OPTIONS = BOOKING_RULES.services.map((s) => ({
  value: s,
  label: s === "Other" ? "Other / not sure" : s,
}));

const LETTER_ACCEPT = Object.keys(BOOKING_RULES.letterTypes)
  .map((ext) => `.${ext}`)
  .join(",");

/** Local midnight today, for disabling past days in the date picker. */
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/* Progressive enhancement: without JavaScript this is a normal multipart form POST (native date
   inputs, CSS-toggled last day), and /api/book answers with its own confirmation page. With
   JavaScript the dates use the shadcn/ui calendar, the form submits in place, and field errors
   from the server appear under their fields. */
export function BookingForm() {
  const hydrated = useHydrated();
  const [status, setStatus] = useState<Status>("idle");
  const [submissions, setSubmissions] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState("");
  const statusRef = useRef<HTMLParagraphElement>(null);

  // A "Book now" link on a service panel preselects that service.
  const requested = useRequestedService();
  const [chosenServices, setChosenServices] = useState<string[]>([]);
  const [seen, setSeen] = useState(requested);
  if (requested !== seen) {
    setSeen(requested);
    // Tick the requested service, keeping anything already ticked.
    if (requested && !chosenServices.includes(requested)) {
      setChosenServices([...chosenServices, requested]);
    }
  }

  const [multiDay, setMultiDay] = useState(false);
  const [dates, setDates] = useState<DateRangeValue>({});

  // Booked days from Bidyo's calendar: struck through in the picker, and not selectable when
  // the admin turns on the overlap check (blockBooked).
  const schedule = useSchedule();
  const booked = schedule.status === "ready" ? schedule.booked : [];
  const blockBooked = schedule.status === "ready" && schedule.blockBooked;

  useEffect(() => {
    if (status === "sent" || status === "unavailable" || status === "error") {
      statusRef.current?.focus();
    }
  }, [status]);

  const fail = (msg: string, fieldErrors: Errors = {}) => {
    setErrors(fieldErrors);
    setMessage(msg);
    setStatus("error");
  };

  const toggleMultiDay = (on: boolean) => {
    setMultiDay(on);
    // Keep the first day; a range needs its last day picked again.
    setDates((d) => ({ from: d.from }));
  };

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const found: Errors = {};

    // The calendar posts through hidden inputs, which the browser doesn't validate.
    if (!dates.from) found.start_date = "Choose the event date.";
    else if (multiDay && !(dates.to && dates.to > dates.from)) {
      found.end_date = "Choose the last day of the event (at least the day after the first).";
    }

    // Checkbox groups and the crew total can't be required natively, so check them here.
    if (chosenServices.length === 0) found.services = "Choose at least one service.";
    const crewTotal =
      Number(data.get("photographers") || 0) + Number(data.get("videographers") || 0);
    if (crewTotal < BOOKING_RULES.crew.minTotal) {
      found.crew = "Ask for at least one photographer or videographer.";
    }

    // Check the letter here too, so a too-big file fails fast instead of after uploading.
    const letter = data.get("letter");
    if (letter instanceof File && letter.size > 0) {
      const ext = letter.name.split(".").pop()?.toLowerCase() ?? "";
      if (!(ext in BOOKING_RULES.letterTypes)) {
        found.letter = "Upload a PDF, Word document, JPG or PNG.";
      } else if (letter.size > BOOKING_RULES.letterMaxBytes) {
        found.letter = "The letter must be 4 MB or smaller.";
      }
    }
    if (Object.keys(found).length) return fail("Check the highlighted fields.", found);

    setStatus("sending");
    setErrors({});
    // A Turnstile token works once, so get a fresh one whatever the outcome.
    setSubmissions((n) => n + 1);
    try {
      const res = await fetch(BOOKING_ENDPOINT, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
      });
      const body = (await res.json().catch(() => null)) as {
        ok?: boolean;
        outcome?: "received" | "unavailable";
        errors?: Errors;
        message?: string;
      } | null;
      // Declined automatically: the date clashes with Bidyo's calendar. Keep their details so
      // they only need to pick another date.
      if (res.ok && body?.ok && body.outcome === "unavailable") {
        setDates({});
        setStatus("unavailable");
        return;
      }
      if (res.ok && body?.ok) {
        form.reset();
        setChosenServices([]);
        setDates({});
        setMultiDay(false);
        setStatus("sent");
        return;
      }
      if (body?.errors) return fail("Check the highlighted fields.", body.errors);
      // Security check or too many requests: the server's message says what to do. Other
      // failures' messages are written for the no-JavaScript page, so use the generic line.
      if ((res.status === 400 || res.status === 429) && body?.message) return fail(body.message);
      fail("That didn't go through.");
    } catch {
      fail("That didn't go through.");
    }
  }

  const max = BOOKING_RULES.maxLength;
  return (
    <form
      action={BOOKING_ENDPOINT}
      method="POST"
      encType="multipart/form-data"
      onSubmit={onSubmit}
      className="flex min-w-0 flex-col gap-8"
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
      <RequiredNote />

      <FormSection title="Your details">
        <div className="grid gap-x-5 gap-y-6 sm:grid-cols-6">
          <TextField
            label="First name"
            name="first_name"
            autoComplete="given-name"
            maxLength={max.first_name}
            error={errors.first_name}
            className="sm:col-span-2"
          />
          <TextField
            label="Middle name"
            name="middle_name"
            autoComplete="additional-name"
            optional
            maxLength={max.middle_name}
            error={errors.middle_name}
            className="sm:col-span-2"
          />
          <TextField
            label="Last name"
            name="last_name"
            autoComplete="family-name"
            maxLength={max.last_name}
            error={errors.last_name}
            className="sm:col-span-2"
          />
          <TextField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            hint="UNC email (@unc.edu.ph) preferred"
            maxLength={max.email}
            error={errors.email}
            className="sm:col-span-3"
          />
          <TextField
            label="Mobile number"
            name="mobile"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            hint="e.g. 0917 123 4567"
            pattern={BOOKING_RULES.mobilePattern}
            title="A Philippine mobile number, like 0917 123 4567"
            maxLength={max.mobile}
            error={errors.mobile}
            className="sm:col-span-3"
          />
        </div>
      </FormSection>

      <FormSection title="Event">
        <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2">
          <TextField
            label="Organization"
            name="organization"
            autoComplete="organization"
            maxLength={max.organization}
            error={errors.organization}
          />
          <TextField
            label="Activity / event title"
            name="event_title"
            maxLength={max.event_title}
            error={errors.event_title}
          />
          <CheckboxGroupField
            legend="Services"
            name="services"
            hint="Tick everything you need."
            options={SERVICE_OPTIONS}
            value={chosenServices}
            onChange={setChosenServices}
            error={errors.services}
            className="sm:col-span-2"
          />
          <TextField
            label="Photographers"
            name="photographers"
            type="number"
            inputMode="numeric"
            optional
            min={BOOKING_RULES.crew.min}
            max={BOOKING_RULES.crew.max}
            step={1}
            placeholder="0"
            error={errors.photographers}
          />
          <TextField
            label="Videographers"
            name="videographers"
            type="number"
            inputMode="numeric"
            optional
            min={BOOKING_RULES.crew.min}
            max={BOOKING_RULES.crew.max}
            step={1}
            placeholder="0"
            error={errors.videographers}
          />
          <p
            id="crew-note"
            className={cn(
              "-mt-3 text-sm sm:col-span-2",
              errors.crew ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {errors.crew ?? "How many of each? At least one in total."}
          </p>{" "}
        </div>
      </FormSection>

      <FormSection title="Date & place">
        {/* group/dates: without JavaScript the last-day input is shown by CSS when the box is
            ticked. With JavaScript one calendar handles both: single day, or a range. */}
        <div className="group/dates grid gap-x-5 gap-y-6 sm:grid-cols-2">
          {hydrated ? (
            <>
              <DatePickerField
                label={multiDay ? "Event dates" : "Event date"}
                mode={multiDay ? "range" : "single"}
                value={dates}
                onChange={setDates}
                disabled={
                  blockBooked ? [{ before: startOfToday() }, ...booked] : { before: startOfToday() }
                }
                marked={booked}
                hint={
                  booked.length
                    ? blockBooked
                      ? "Booked days can't be selected."
                      : "Struck-through days are already booked."
                    : undefined
                }
                placeholder={multiDay ? "Pick the first and last day" : "Pick a date"}
                error={errors.start_date ?? errors.end_date}
                className="sm:col-span-2"
              />
              <input
                type="hidden"
                name="start_date"
                value={dates.from ? toIsoDate(dates.from) : ""}
              />
              {multiDay && (
                <input
                  type="hidden"
                  name="end_date"
                  value={dates.from && dates.to && dates.to > dates.from ? toIsoDate(dates.to) : ""}
                />
              )}
            </>
          ) : (
            <>
              <TextField
                label="Event date"
                name="start_date"
                type="date"
                error={errors.start_date}
              />
              <TextField
                label="Last day"
                name="end_date"
                type="date"
                required={false}
                className="hidden group-has-[:checked]/dates:flex"
                error={errors.end_date}
              />
            </>
          )}
          <CheckboxField
            label="Multi-day event (2 days or more)"
            name="multiday"
            value="yes"
            checked={multiDay}
            onCheckedChange={toggleMultiDay}
            className="sm:col-span-2"
          />
          <TextField
            label="Event place"
            name="venue"
            maxLength={max.venue}
            error={errors.venue}
            className="sm:col-span-2"
          />
        </div>
      </FormSection>

      <FormSection title="Extras">
        <div className="grid gap-y-6">
          <TextAreaField
            label="Additional requests"
            name="requests"
            optional
            rows={4}
            maxLength={max.requests}
            error={errors.requests}
          />
          <FileField
            label="Formal letter"
            name="letter"
            optional
            accept={LETTER_ACCEPT}
            hint="If you have one: PDF, Word, JPG or PNG, up to 4 MB."
            error={errors.letter}
          />
        </div>
      </FormSection>

      <Turnstile resetKey={submissions} />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <Button type="submit" size="lg" disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : "Send request"} <ArrowIcon />
        </Button>
        <p ref={statusRef} tabIndex={-1} role="status" className="outline-none">
          {status === "sent" && "Thanks! We got your request and will reply by email."}
          {status === "unavailable" && (
            <span className="text-accent-bright">
              That date is already booked.{" "}
              <a href="#schedule" className="underline underline-offset-4">
                Check our schedule
              </a>{" "}
              and pick another day. Your other details are still filled in.
            </span>
          )}
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
