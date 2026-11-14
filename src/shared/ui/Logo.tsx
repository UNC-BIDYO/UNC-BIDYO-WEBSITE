import colorLogo from "@/shared/assets/brand/bidyo-logo-color.png";
import whiteLogo from "@/shared/assets/brand/bidyo-logo-white.png";
import { BRAND } from "@/shared/lib/site";
import { cn } from "@/shared/lib/utils";

/* Intrinsic sizes of the cropped artwork, so the browser reserves space (no layout shift). */
const logos = {
  /** All-white mark for dark and photo surfaces. */
  white: { src: whiteLogo, width: 416, height: 183 },
  /** Black + burgundy mark for light surfaces. */
  color: { src: colorLogo, width: 791, height: 342 },
} as const;

type LogoProps = {
  variant?: keyof typeof logos;
  /** Set the rendered size with a height class, e.g. "h-9"; width follows the aspect ratio. */
  className?: string;
};

export function Logo({ variant = "color", className }: LogoProps) {
  const { src, width, height } = logos[variant];
  return (
    <img
      src={src}
      width={width}
      height={height}
      alt={BRAND}
      decoding="async"
      className={cn("w-auto", className)}
    />
  );
}
