import { useId, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cx } from "@/shared/lib/cx";

/* Form controls as a typed API: a label above every control (never placeholder-only),
   square corners like Button, and a tone for light or dark surfaces. */

export type FieldTone = "light" | "dark";

/* min-h keeps selects and date inputs the same height as text inputs across browsers. */
const controlBase =
  "block min-h-[3.125rem] w-full border px-4 py-3 text-base transition-colors disabled:opacity-50";

const controlTones = {
  light: "border-line-strong bg-surface text-ink placeholder:text-muted hover:border-ink",
  /* color-scheme makes the native date picker and select menu dark too. */
  dark: "border-white/35 bg-ink-2 text-white [color-scheme:dark] placeholder:text-muted-dark hover:border-white/70",
} as const;

type ShellProps = {
  label: string;
  /** Shown under the label, linked to the control with aria-describedby. */
  hint?: string;
  /** Marks the field "(optional)"; fields are required by default. */
  optional?: boolean;
  tone?: FieldTone;
  className?: string;
  children: (ids: { id: string; hintId?: string }) => ReactNode;
};

function FieldShell({ label, hint, optional, tone = "light", className, children }: ShellProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const dark = tone === "dark";
  return (
    <div className={className}>
      <label htmlFor={id} className="font-mono text-xs font-medium uppercase tracking-[0.16em]">
        {label}
        {optional && (
          <span
            className={cx(
              "ml-2 normal-case tracking-normal",
              dark ? "text-muted-dark" : "text-muted",
            )}
          >
            (optional)
          </span>
        )}
      </label>
      {hint && (
        <p id={hintId} className={cx("mt-1 text-sm", dark ? "text-muted-dark" : "text-muted")}>
          {hint}
        </p>
      )}
      <div className="mt-2">{children({ id, hintId })}</div>
    </div>
  );
}

type Common = Omit<ShellProps, "children">;

export function TextField({
  label,
  hint,
  optional,
  tone = "light",
  className,
  ...input
}: Common & Omit<ComponentPropsWithoutRef<"input">, "id">) {
  return (
    <FieldShell label={label} hint={hint} optional={optional} tone={tone} className={className}>
      {({ id, hintId }) => (
        <input
          id={id}
          aria-describedby={hintId}
          required={!optional}
          className={cx(controlBase, controlTones[tone])}
          {...input}
        />
      )}
    </FieldShell>
  );
}

export function SelectField({
  label,
  hint,
  optional,
  tone = "light",
  className,
  children,
  ...select
}: Common & Omit<ComponentPropsWithoutRef<"select">, "id">) {
  return (
    <FieldShell label={label} hint={hint} optional={optional} tone={tone} className={className}>
      {({ id, hintId }) => (
        <select
          id={id}
          aria-describedby={hintId}
          required={!optional}
          className={cx(controlBase, controlTones[tone])}
          {...select}
        >
          {children}
        </select>
      )}
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  hint,
  optional,
  tone = "light",
  className,
  rows = 5,
  ...textarea
}: Common & Omit<ComponentPropsWithoutRef<"textarea">, "id">) {
  return (
    <FieldShell label={label} hint={hint} optional={optional} tone={tone} className={className}>
      {({ id, hintId }) => (
        <textarea
          id={id}
          rows={rows}
          aria-describedby={hintId}
          required={!optional}
          className={cx(controlBase, controlTones[tone], "resize-y")}
          {...textarea}
        />
      )}
    </FieldShell>
  );
}
