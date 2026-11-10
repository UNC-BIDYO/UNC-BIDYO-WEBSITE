import type { ComponentPropsWithoutRef } from "react";
import { cx } from "@/shared/lib/cx";

/* Design tokens for actions, exposed as a typed variant API.
   Square corners and tracked caps follow the cinematic/slate direction. */
const base =
  "inline-flex shrink-0 items-center justify-center gap-3 font-semibold uppercase tracking-[0.12em] transition-colors disabled:pointer-events-none disabled:opacity-35";

const variants = {
  /** Main call to action. */
  primary: "bg-accent text-white hover:bg-accent-dark",
  /** Secondary action on light surfaces. */
  outline: "border border-line-strong text-ink hover:border-ink hover:bg-ink hover:text-white",
  /** Secondary action on dark or photo surfaces. */
  "outline-light": "border border-white/60 text-white hover:bg-white hover:text-ink",
  /** Floating control over video or photos. */
  overlay:
    "border border-white/60 bg-black/45 text-white backdrop-blur hover:bg-white hover:text-ink",
} as const;

const sizes = {
  sm: "h-10 px-5 text-xs",
  md: "h-12 px-6 text-xs",
  lg: "h-14 px-8 text-sm",
  icon: "h-12 w-12",
  "icon-sm": "h-11 w-11",
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

type StyleProps = { variant?: ButtonVariant; size?: ButtonSize };

export const buttonStyles = ({ variant = "primary", size = "md" }: StyleProps = {}) =>
  cx(base, variants[variant], sizes[size]);

type ButtonProps = ComponentPropsWithoutRef<"button"> & StyleProps;

export function Button({ variant, size, className, type = "button", ...rest }: ButtonProps) {
  return (
    <button type={type} className={cx(buttonStyles({ variant, size }), className)} {...rest} />
  );
}

type ButtonLinkProps = ComponentPropsWithoutRef<"a"> & StyleProps;

/** A link that looks like a button (navigation, mailto). */
export function ButtonLink({ variant, size, className, ...rest }: ButtonLinkProps) {
  return <a className={cx(buttonStyles({ variant, size }), className)} {...rest} />;
}
