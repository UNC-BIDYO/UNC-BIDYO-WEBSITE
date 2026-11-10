import { useEffect, useRef, useState } from "react";
import { useHydrated } from "@/shared/hooks/useHydrated";
import { usePrefersReducedMotion } from "@/shared/hooks/usePrefersReducedMotion";
import { Button, ButtonLink } from "@/shared/ui/Button";
import { Container } from "@/shared/ui/Container";
import { ArrowIcon, PlayPauseIcon } from "@/shared/ui/icons";
import { Logo } from "@/shared/ui/Logo";

type NavigatorWithConnection = Navigator & { connection?: { saveData?: boolean } };

export function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduced = usePrefersReducedMotion();
  const hydrated = useHydrated();
  // null = follow the motion/data preferences; otherwise the visitor's explicit choice.
  const [choice, setChoice] = useState<"play" | "pause" | null>(null);
  const [saveData] = useState(
    () =>
      typeof navigator !== "undefined" &&
      !!(navigator as NavigatorWithConnection).connection?.saveData,
  );
  // Never "playing" in the prerendered HTML or during hydration: the real preferences are
  // only known after, and starting early would download the video for reduced-motion users.
  const playing = hydrated && (choice ? choice === "play" : !reduced && !saveData);
  // Only attach the 1.3 MB source once the video should actually play; until then the poster is enough.
  const [loadVideo, setLoadVideo] = useState(false);
  if (playing && !loadVideo) setLoadVideo(true);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !loadVideo) return;
    v.muted = true;
    if (playing) v.play().catch(() => setChoice("pause"));
    else v.pause();
  }, [playing, loadVideo]);

  return (
    <header
      data-surface="dark"
      className="relative flex min-h-[100svh] flex-col overflow-hidden bg-ink text-white"
    >
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        src={loadVideo ? "/hero.mp4" : undefined}
        poster="/hero-poster.jpg"
        loop
        muted
        playsInline
        preload="metadata"
        aria-hidden
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/25 to-black/80" />

      <Container className="relative">
        <nav className="flex items-center justify-between py-6" aria-label="Main">
          <a href="/" className="-m-1 p-1">
            <Logo variant="white" className="h-9 sm:h-10" />
          </a>
          <ButtonLink href="#book" variant="outline-light" size="sm">
            Get a quote
          </ButtonLink>
        </nav>
      </Container>

      <Container className="relative flex flex-1 items-end pb-20 pt-12 sm:pb-24">
        <div>
          <h1 className="max-w-5xl font-display text-display uppercase leading-[0.88] motion-safe:animate-settle">
            Capturing the moments of every UNCean.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white sm:text-xl motion-safe:animate-rise motion-safe:[animation-delay:260ms]">
            [placeholder]
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4 motion-safe:animate-rise motion-safe:[animation-delay:380ms]">
            <ButtonLink href="#book" size="lg">
              Book your event <ArrowIcon />
            </ButtonLink>
            <span className="font-mono text-xs uppercase tracking-[0.16em] text-white">
              [placeholder]
            </span>
          </div>
        </div>
      </Container>

      <Button
        variant="overlay"
        size="icon-sm"
        onClick={() => setChoice(playing ? "pause" : "play")}
        aria-label={playing ? "Pause background video" : "Play background video"}
        className="absolute bottom-5 right-5 z-10 sm:right-8"
      >
        <PlayPauseIcon playing={playing} />
      </Button>
    </header>
  );
}
