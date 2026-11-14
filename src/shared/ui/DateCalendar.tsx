import type { Matcher } from "react-day-picker";
import { Calendar } from "@/shared/ui/primitives/calendar";

export type DateRangeValue = { from?: Date; to?: Date };

type Props = {
  mode: "single" | "range";
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  disabled?: Matcher | Matcher[];
  /** Days to mark (e.g. already booked), shown struck through. */
  marked?: Date[];
  numberOfMonths?: number;
};

/* Loaded on demand by DatePickerField (React.lazy), so react-day-picker stays out of the
   page's first download. */
export default function DateCalendar({
  mode,
  value,
  onChange,
  disabled,
  marked,
  numberOfMonths = 1,
}: Props) {
  const shared = {
    disabled,
    numberOfMonths,
    defaultMonth: value.from,
    modifiers: marked ? { booked: marked } : undefined,
    modifiersClassNames: { booked: "line-through decoration-2 decoration-destructive" },
    className: "p-0 [--cell-size:--spacing(10)]",
  };
  return mode === "single" ? (
    <Calendar
      {...shared}
      mode="single"
      selected={value.from}
      onSelect={(day) => onChange({ from: day })}
      // Moves focus into the calendar when its popover opens (react-day-picker's documented way).
      // oxlint-disable-next-line jsx-a11y/no-autofocus
      autoFocus
    />
  ) : (
    <Calendar
      {...shared}
      mode="range"
      selected={value.from ? { from: value.from, to: value.to } : undefined}
      onSelect={(range) => onChange({ from: range?.from, to: range?.to })}
      // Moves focus into the calendar when its popover opens (react-day-picker's documented way).
      // oxlint-disable-next-line jsx-a11y/no-autofocus
      autoFocus
    />
  );
}
