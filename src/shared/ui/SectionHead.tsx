import { cx } from "@/shared/lib/cx";

type SectionHeadProps = {
  /** Reel-style index, e.g. "01". */
  index: string;
  eyebrow: string;
  title: string;
  intro?: string;
  tone?: "light" | "dark";
  id?: string;
};

export function SectionHead({
  index,
  eyebrow,
  title,
  intro,
  tone = "light",
  id,
}: SectionHeadProps) {
  const dark = tone === "dark";
  return (
    <div className="max-w-3xl">
      <p
        className={cx(
          "font-mono text-xs font-medium uppercase tracking-[0.2em]",
          dark ? "text-accent-bright" : "text-accent",
        )}
      >
        <span aria-hidden>{index} / </span>
        {eyebrow}
      </p>
      <h2 id={id} className="mt-4 font-display text-h2 uppercase leading-[0.92]">
        {title}
      </h2>
      {intro && (
        <p
          className={cx(
            "mt-5 max-w-xl text-lg leading-relaxed",
            dark ? "text-muted-dark" : "text-muted",
          )}
        >
          {intro}
        </p>
      )}
    </div>
  );
}
