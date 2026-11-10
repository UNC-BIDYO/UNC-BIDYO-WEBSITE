import { cx } from "@/shared/lib/cx";
import type { Member } from "./members";
import { portraitsFor } from "./portraits";

/* Portraits are sized by the card's height (90% of a 4:5 card), so a square cutout renders
   ~1.125× the card width; these are the card widths per breakpoint (Team.tsx) × 1.125. */
const SIZES = "(min-width: 1024px) 305px, (min-width: 768px) 38vw, (min-width: 640px) 50vw, 81vw";

/* Height-led sizing: fills the card vertically, centred, with spare side space cropped. */
const portraitFit = "absolute bottom-0 left-1/2 h-[90%] w-auto max-w-none -translate-x-1/2";

/* First + last name initials, skipping nicknames (“Junie”), middle initials (S.) and suffixes (Jr.). */
const initials = (name: string) => {
  const words = name
    .split(/\s+/)
    .filter((w) => /^\p{L}{2,}$/u.test(w) && !/^(jr|sr|ii|iii|iv)$/i.test(w));
  return words.length ? words[0][0] + (words.length > 1 ? words[words.length - 1][0] : "") : "";
};

type MemberCardProps = {
  member: Member;
  index: number;
  /** The slide currently in view. On touch screens (no hover) it shows the second portrait. */
  current: boolean;
};

export function MemberCard({ member, index, current }: MemberCardProps) {
  const { main, hover } = portraitsFor(member.photo);
  const number = String(index + 1).padStart(2, "0");
  // The second portrait shows on hover (mouse), and on the current slide for touch screens.
  const showHover = cx("group-hover:opacity-100", current && "[@media(hover:none)]:opacity-100");
  const fade = "motion-safe:transition-opacity motion-safe:duration-500";

  return (
    <div className="group">
      {/* One shared backdrop makes the cutouts read as a set: charcoal, a burgundy
          glow rising from below, and the member number set large like a slate. */}
      <div className="relative aspect-[4/5] overflow-hidden bg-ink-2">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(85%_65%_at_50%_100%,var(--color-accent)_0%,transparent_70%)] opacity-80 group-hover:opacity-100 motion-safe:transition-opacity motion-safe:duration-500"
        />
        <span
          aria-hidden
          className="absolute -right-2 -top-6 font-display text-[11rem] leading-none text-white/[0.06]"
        >
          {number}
        </span>

        {main ? (
          <>
            <img
              src={main.src}
              srcSet={main.srcSet}
              sizes={SIZES}
              alt={`Portrait of ${member.name}`}
              loading="lazy"
              decoding="async"
              draggable={false}
              className={cx(
                portraitFit,
                hover && fade,
                hover && "group-hover:opacity-0",
                hover && current && "[@media(hover:none)]:opacity-0",
              )}
            />
            {hover && (
              <img
                src={hover.src}
                srcSet={hover.srcSet}
                sizes={SIZES}
                alt=""
                loading="lazy"
                decoding="async"
                draggable={false}
                className={cx(portraitFit, "opacity-0", fade, showHover)}
              />
            )}
          </>
        ) : (
          <span
            aria-hidden
            className="absolute inset-0 flex items-center justify-center font-display text-7xl uppercase text-accent-bright"
          >
            {initials(member.name)}
          </span>
        )}
      </div>

      <p className="mt-4 font-mono text-xs uppercase tracking-[0.16em] text-muted">
        {number} — {member.role}
      </p>
      <h3 className="mt-1 font-display text-3xl uppercase leading-none">{member.name}</h3>
    </div>
  );
}
