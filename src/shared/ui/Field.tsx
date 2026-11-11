import { useId, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cx } from "@/shared/lib/cx";

/* Form controls as a typed API: a label above every control (never placeholder-only),
   square corners like Button, a tone for light or dark surfaces, and an error state that is
   announced with the control (aria-invalid + aria-describedby). */

export type FieldTone = "light" | "dark";

/* min-h keeps selects and date inputs the same height as text inputs across browsers. */
const controlBase =
  "block min-h-[3.125rem] w-full border px-4 py-3 text-base transition-colors disabled:opacity-50";

const controlTones = {
  light: "bg-surface text-ink placeholder:text-muted",
  /* color-scheme makes the native date picker and select menu dark too. */
  dark: "bg-ink-2 text-white [color-scheme:dark] placeholder:text-muted-dark",
} as const;

/* Borders are picked as a whole (normal or error), never stacked, so the error colour
   doesn't depend on the order Tailwind emits the classes in. */
const borderTones = {
  light: { normal: "border-line-strong hover:border-ink", error: "border-accent" },
  dark: { normal: "border-white/35 hover:border-white/70", error: "border-accent-bright" },
} as const;

const errorText = { light: "text-accent", dark: "text-accent-bright" } as const;

const mutedTone = (tone: FieldTone) => (tone === "dark" ? "text-muted-dark" : "text-muted");

type ShellProps = {
  label: string;
  /** Shown under the label, linked to the control with aria-describedby. */
  hint?: string;
  /** Shown under the control in the error colour; marks the control aria-invalid. */
  error?: string;
  /** Marks the field "(optional)"; fields are required by default. */
  optional?: boolean;
  tone?: FieldTone;
  className?: string;
};

type ControlProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  required: boolean;
  className: string;
};

function FieldShell({
  label,
  hint,
  error,
  optional,
  tone = "light",
  className,
  children,
}: ShellProps & { children: (control: ControlProps) => ReactNode }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="font-mono text-xs font-medium uppercase tracking-[0.16em]">
        {label}
        {optional && (
          <span className={cx("ml-2 normal-case tracking-normal", mutedTone(tone))}>
            (optional)
          </span>
        )}
      </label>
      {hint && (
        <p id={hintId} className={cx("mt-1 text-sm", mutedTone(tone))}>
          {hint}
        </p>
      )}
      <div className="mt-2">
        {children({
          id,
          "aria-describedby": [hintId, errorId].filter(Boolean).join(" ") || undefined,
          "aria-invalid": error ? true : undefined,
          required: !optional,
          className: cx(
            controlBase,
            controlTones[tone],
            borderTones[tone][error ? "error" : "normal"],
          ),
        })}
      </div>
      {error && (
        <p id={errorId} className={cx("mt-2 text-sm", errorText[tone])}>
          {error}
        </p>
      )}
    </div>
  );
}

type Common = ShellProps;

export function TextField({
  label,
  hint,
  error,
  optional,
  tone,
  className,
  ...input
}: Common & Omit<ComponentPropsWithoutRef<"input">, "id">) {
  return (
    <FieldShell {...{ label, hint, error, optional, tone, className }}>
      {(control) => <input {...control} {...input} />}
    </FieldShell>
  );
}

export function SelectField({
  label,
  hint,
  error,
  optional,
  tone,
  className,
  children,
  ...select
}: Common & Omit<ComponentPropsWithoutRef<"select">, "id">) {
  return (
    <FieldShell {...{ label, hint, error, optional, tone, className }}>
      {(control) => (
        <select {...control} {...select}>
          {children}
        </select>
      )}
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  optional,
  tone,
  className,
  rows = 5,
  ...textarea
}: Common & Omit<ComponentPropsWithoutRef<"textarea">, "id">) {
  return (
    <FieldShell {...{ label, hint, error, optional, tone, className }}>
      {({ className: cls, ...control }) => (
        <textarea {...control} rows={rows} className={cx(cls, "resize-y")} {...textarea} />
      )}
    </FieldShell>
  );
}

/** File picker; the browse button is styled like a small outline Button. */
export function FileField({
  label,
  hint,
  error,
  optional,
  tone = "light",
  className,
  ...input
}: Common & Omit<ComponentPropsWithoutRef<"input">, "id" | "type">) {
  return (
    <FieldShell {...{ label, hint, error, optional, tone, className }}>
      {({ className: cls, ...control }) => (
        <input
          {...control}
          type="file"
          className={cx(
            cls,
            "cursor-pointer py-2 file:mr-4 file:cursor-pointer file:border file:px-4 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-[0.12em] file:transition-colors",
            tone === "dark"
              ? "file:border-white/60 file:bg-transparent file:text-white hover:file:bg-white hover:file:text-ink"
              : "file:border-line-strong file:bg-transparent file:text-ink hover:file:bg-ink hover:file:text-white",
          )}
          {...input}
        />
      )}
    </FieldShell>
  );
}

/** A single checkbox with its label beside it. Optional by default. */
export function CheckboxField({
  label,
  tone = "light",
  className,
  ...input
}: { label: string; tone?: FieldTone; className?: string } & Omit<
  ComponentPropsWithoutRef<"input">,
  "id" | "type"
>) {
  const id = useId();
  return (
    <div className={cx("flex items-center gap-3", className)}>
      <input
        id={id}
        type="checkbox"
        className={cx(
          "h-5 w-5 shrink-0 cursor-pointer",
          tone === "dark" ? "accent-accent-bright [color-scheme:dark]" : "accent-accent",
        )}
        {...input}
      />
      <label htmlFor={id} className="cursor-pointer text-base">
        {label}
      </label>
    </div>
  );
}
