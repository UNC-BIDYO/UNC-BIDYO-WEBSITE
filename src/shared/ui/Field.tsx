import { useId, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { useHydrated } from "@/shared/hooks/useHydrated";
import { cn } from "@/shared/lib/utils";
import { Checkbox } from "@/shared/ui/primitives/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/shared/ui/primitives/field";
import { Input } from "@/shared/ui/primitives/input";
import { NativeSelect } from "@/shared/ui/primitives/native-select";
import { Textarea } from "@/shared/ui/primitives/textarea";

/* The site's form API, built on the shadcn/ui primitives in ./primitives.
   `optional` is the single source of truth for whether a field is required: it sets the
   control's `required` (so native validation and aria-required follow) and the red asterisk.
   Colours come from the surface (see the shadcn tokens in index.css), so the same fields work
   on paper and on ink. */

/** Shared size for single-line controls, matching the site's buttons. */
const controlSize = "h-12 px-4 text-base md:text-base";

const labelStyle = "font-mono text-xs font-medium uppercase tracking-[0.16em]";

/** Red asterisk for required fields; hidden from screen readers, which announce "required". */
function RequiredMark() {
  return (
    <span aria-hidden className="text-destructive">
      *
    </span>
  );
}

/** The note that explains the asterisk; put it once at the top of a form. */
export function RequiredNote({ className }: { className?: string }) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      Fields marked <RequiredMark /> are required.
    </p>
  );
}

/** A bordered group of fields with its heading on the border (native fieldset + legend). */
export function FormSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <FieldSet className={cn("min-w-0 border border-border px-5 pt-3 pb-6 sm:px-6", className)}>
      <FieldLegend className={cn(labelStyle, "-ml-2 mb-4 px-2 text-sm text-foreground")}>
        {title}
      </FieldLegend>
      {children}
    </FieldSet>
  );
}

type ShellProps = {
  label: string;
  /** Shown under the label, linked to the control with aria-describedby. */
  hint?: string;
  /** Shown under the control; marks the control aria-invalid. */
  error?: string;
  /** Fields are required unless this is set. */
  optional?: boolean;
  className?: string;
};

export type ControlProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  "aria-required"?: true;
  required: boolean;
};

export function FieldShell({
  label,
  hint,
  error,
  optional,
  className,
  children,
}: ShellProps & { children: (control: ControlProps) => ReactNode }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <Field data-invalid={error ? true : undefined} className={cn("gap-2", className)}>
      <FieldLabel htmlFor={id} className={cn(labelStyle, "gap-1.5")}>
        {label}
        {!optional && <RequiredMark />}
      </FieldLabel>
      {hint && (
        <FieldDescription id={hintId} className="-mt-1">
          {hint}
        </FieldDescription>
      )}
      {children({
        id,
        "aria-describedby": [hintId, errorId].filter(Boolean).join(" ") || undefined,
        "aria-invalid": error ? true : undefined,
        "aria-required": optional ? undefined : true,
        required: !optional,
      })}
      {/* No role="alert" per field: the form's status line announces that there are errors,
          and each message is read with its control through aria-describedby. */}
      {error && (
        <FieldError id={errorId} role={undefined}>
          {error}
        </FieldError>
      )}
    </Field>
  );
}

export function TextField({
  label,
  hint,
  error,
  optional,
  className,
  ...input
}: ShellProps & Omit<ComponentPropsWithoutRef<"input">, "id">) {
  return (
    <FieldShell {...{ label, hint, error, optional, className }}>
      {(control) => <Input {...control} className={controlSize} {...input} />}
    </FieldShell>
  );
}

export function SelectField({
  label,
  hint,
  error,
  optional,
  className,
  children,
  ...select
}: ShellProps & Omit<ComponentPropsWithoutRef<"select">, "id" | "size">) {
  return (
    <FieldShell {...{ label, hint, error, optional, className }}>
      {(control) => (
        <NativeSelect {...control} className={cn(controlSize, "pr-10")} {...select}>
          {children}
        </NativeSelect>
      )}
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  optional,
  className,
  rows = 5,
  ...textarea
}: ShellProps & Omit<ComponentPropsWithoutRef<"textarea">, "id">) {
  return (
    <FieldShell {...{ label, hint, error, optional, className }}>
      {(control) => (
        <Textarea
          {...control}
          rows={rows}
          className="min-h-28 resize-y px-4 py-3 text-base md:text-base"
          {...textarea}
        />
      )}
    </FieldShell>
  );
}

/** File picker in the shadcn/ui `<Input type="file" />` format (its own file-button styling),
    sized like the other controls. */
export function FileField({
  label,
  hint,
  error,
  optional,
  className,
  ...input
}: ShellProps & Omit<ComponentPropsWithoutRef<"input">, "id" | "type">) {
  return (
    <FieldShell {...{ label, hint, error, optional, className }}>
      {(control) => (
        <Input
          {...control}
          type="file"
          className={cn(controlSize, "cursor-pointer py-0 leading-[3rem] file:mr-3 file:h-full")}
          {...input}
        />
      )}
    </FieldShell>
  );
}

type CheckboxFieldProps = {
  label: string;
  name: string;
  value?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
};

/** A single optional checkbox with its label beside it. Before hydration it is a native
    checkbox (works without JavaScript, and CSS can react to :checked); after hydration it is
    the shadcn/ui Checkbox, which submits through a hidden native input. */
export function CheckboxField({
  label,
  name,
  value = "on",
  checked,
  onCheckedChange,
  className,
}: CheckboxFieldProps) {
  const id = useId();
  const hydrated = useHydrated();
  return (
    <Field orientation="horizontal" className={cn("w-auto gap-3", className)}>
      {hydrated ? (
        <Checkbox
          id={id}
          name={name}
          value={value}
          checked={checked}
          onCheckedChange={(state) => onCheckedChange(state === true)}
          className="size-5"
        />
      ) : (
        <input
          id={id}
          type="checkbox"
          name={name}
          value={value}
          className="size-5 accent-primary"
        />
      )}
      <FieldLabel htmlFor={id} className="cursor-pointer text-base font-normal">
        {label}
      </FieldLabel>
    </Field>
  );
}
