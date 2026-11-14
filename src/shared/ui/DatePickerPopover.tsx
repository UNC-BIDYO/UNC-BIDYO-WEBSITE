import { CalendarIcon } from "lucide-react";
import type { Matcher } from "react-day-picker";
import DateCalendar, { type DateRangeValue } from "@/shared/ui/DateCalendar";
import type { ControlProps } from "@/shared/ui/Field";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/primitives/popover";

type Props = {
  control: Omit<ControlProps, "required">;
  triggerClassName: string;
  text: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "single" | "range";
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  disabled?: Matcher | Matcher[];
  marked?: Date[];
};

/* Loaded on demand by DatePickerField (React.lazy): the popover's positioning code and
   react-day-picker stay out of the page's first download. */
export default function DatePickerPopover({
  control,
  triggerClassName,
  text,
  open,
  onOpenChange,
  ...calendar
}: Props) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger {...control} type="button" className={triggerClassName}>
        <span>{text}</span>
        <CalendarIcon aria-hidden className="size-4 shrink-0 opacity-70" />
      </PopoverTrigger>
      {/* Portaled to <body>, so it re-declares the dark surface for its colours. */}
      <PopoverContent data-surface="dark" align="start" className="w-auto border-border p-3">
        <DateCalendar {...calendar} />
      </PopoverContent>
    </Popover>
  );
}
