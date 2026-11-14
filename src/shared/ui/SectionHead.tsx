import { cn } from "@/shared/lib/utils";

type SectionHeadProps = {
  /** Reel-style index, e.g. "01". */
  index: string;
  eyebrow: string;
  title: string;
  intro?: string;
  /** Surface the heading sits on: paper, ink, or the burgundy accent. */
  tone?: "light" | "dark" | "accent";
  id?: string;
};

const eyebrowTone = { light: "text-accent", dark: "text-accent-bright", accent: "text-white" };
const introTone = { light: "text-muted", dark: "text-muted-dark", accent: "text-white/85" };

export function SectionHead({
  index,
  eyebrow,
  title,
  intro,
  tone = "light",
  id,
}: SectionHeadProps) {
  return (
    <div className="max-w-3xl">
      <p
        className={cn(
          "font-mono text-xs font-medium uppercase tracking-[0.2em]",
          eyebrowTone[tone],
        )}
      >
        <span aria-hidden>{index} / </span>
        {eyebrow}
      </p>
      <h2 id={id} className="mt-4 font-display text-h2 uppercase leading-[0.92]">
        {title}
      </h2>
      {intro && (
        <p className={cn("mt-5 max-w-xl text-lg leading-relaxed", introTone[tone])}>{intro}</p>
      )}
    </div>
  );
}
