import { lazy, Suspense, useState } from "react";
import { CalendarIcon } from "lucide-react";
import type { Matcher } from "react-day-picker";
import { cn } from "@/shared/lib/utils";
import type { DateRangeValue } from "@/shared/ui/DateCalendar";
import { FieldShell } from "@/shared/ui/Field";

const DatePickerPopover = lazy(() => import("@/shared/ui/DatePickerPopover"));

/** YYYY-MM-DD for a local date (what the form posts). */
export const toIsoDate = (d: Date) => d.toLocaleDateString("en-CA");

const display = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

type Props = {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  className?: string;
  mode: "single" | "range";
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  disabled?: Matcher | Matcher[];
  marked?: Date[];
  placeholder?: string;
};

/** Date field: a button that opens a shadcn/ui Calendar in a popover, single day or range.
    The chosen dates are posted by hidden inputs the caller renders (see Booking). The popover
    and calendar load lazily; until then the same-looking button is shown. */
export function DatePickerField({
  label,
  hint,
  error,
  optional,
  className,
  mode,
  value,
  onChange,
  disabled,
  marked,
  placeholder = "Pick a date",
}: Props) {
  const [open, setOpen] = useState(false);
  // After the first click of a range the picker reports from = to; that's not a range yet.
  const fullRange = !!(value.from && value.to && value.to > value.from);
  const text = !value.from
    ? placeholder
    : mode === "range" && fullRange
      ? `${display.format(value.from)} – ${display.format(value.to!)}`
      : mode === "range"
        ? `${display.format(value.from)} – pick the last day`
        : display.format(value.from);

  const triggerClassName = cn(
    "flex h-12 w-full items-center justify-between gap-3 border border-input bg-transparent px-4 text-left text-base transition-[color,box-shadow] outline-none dark:bg-input/30 dark:hover:bg-input/50",
    "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
    "aria-invalid:border-destructive",
    !value.from && "text-muted-foreground",
  );

  const select = (next: DateRangeValue) => {
    onChange(next);
    // Close once the choice is complete; a range needs two different days.
    const done = mode === "single" ? !!next.from : !!(next.from && next.to && next.to > next.from);
    if (done) setOpen(false);
  };

  return (
    <FieldShell {...{ label, hint, error, optional, className }}>
      {({ required: _required, ...control }) => (
        <Suspense
          fallback={
            <button {...control} type="button" aria-busy className={triggerClassName}>
              <span>{text}</span>
              <CalendarIcon aria-hidden className="size-4 shrink-0 opacity-70" />
            </button>
          }
        >
          <DatePickerPopover
            control={control}
            triggerClassName={triggerClassName}
            text={text}
            open={open}
            onOpenChange={setOpen}
            mode={mode}
            value={value}
            onChange={select}
            disabled={disabled}
            marked={marked}
          />
        </Suspense>
      )}
    </FieldShell>
  );
}
