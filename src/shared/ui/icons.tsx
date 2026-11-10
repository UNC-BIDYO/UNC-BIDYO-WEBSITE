export const ArrowIcon = ({ dir = "right" }: { dir?: "left" | "right" }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="square"
    aria-hidden
    className={dir === "left" ? "rotate-180" : undefined}
  >
    <path d="M4 12h15M13 6l6 6-6 6" />
  </svg>
);

export const PlayPauseIcon = ({ playing }: { playing: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    {playing ? <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /> : <path d="M8 5.5v13l11-6.5z" />}
  </svg>
);
