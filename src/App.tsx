import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'

const img = (id: string, w = 1000) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&q=75&w=${w}`

/* Unsplash resizes from the URL, so each photo is offered at several widths
   and the browser picks the smallest that fills its slot (`sizes`). */
const WIDTHS = [400, 640, 960, 1280, 1600]
const srcSet = (id: string) => WIDTHS.map((w) => `${img(id, w)} ${w}w`).join(', ')

const CONTACT_EMAIL = 'hello@frameandlight.example'

/* ---------- shared bits ---------- */
const Container = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`mx-auto w-full max-w-6xl px-5 sm:px-8 ${className}`}>{children}</div>
)

const SectionHead = ({ eyebrow, title, intro }: { eyebrow: string; title: string; intro?: string }) => (
  <div className="max-w-2xl">
    <p className="text-sm font-semibold uppercase tracking-widest text-accent">{eyebrow}</p>
    <h2 className="mt-4 text-h2 font-bold leading-[1.05] tracking-tight">{title}</h2>
    {intro && <p className="mt-5 text-lg leading-relaxed text-muted">{intro}</p>}
  </div>
)

const Arrow = ({ dir = 'right' }: { dir?: 'left' | 'right' }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={dir === 'left' ? 'rotate-180' : ''}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

const PlayPauseIcon = ({ playing }: { playing: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    {playing ? <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /> : <path d="M8 5.5v13l11-6.5z" />}
  </svg>
)

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

function usePrefersReducedMotion() {
  // Read synchronously so the first render already knows (avoids starting the video, then stopping it).
  const [r, setR] = useState(() => typeof window !== 'undefined' && window.matchMedia(REDUCED_MOTION).matches)
  useEffect(() => {
    const m = window.matchMedia(REDUCED_MOTION)
    setR(m.matches)
    const h = () => setR(m.matches)
    m.addEventListener('change', h)
    return () => m.removeEventListener('change', h)
  }, [])
  return r
}

/* ---------- 1. Hero (full-frame) ---------- */
function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const reduced = usePrefersReducedMotion()
  // null = follow the motion preference; otherwise the visitor's explicit choice.
  const [choice, setChoice] = useState<'play' | 'pause' | null>(null)
  const [saveData] = useState(
    () => typeof navigator !== 'undefined' && !!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData,
  )
  const playing = choice ? choice === 'play' : !reduced && !saveData
  // Only attach the 1.3 MB source once the video should actually play; until then the poster is enough.
  const [loadVideo, setLoadVideo] = useState(playing)
  if (playing && !loadVideo) setLoadVideo(true)

  useEffect(() => {
    const v = videoRef.current
    if (!v || !loadVideo) return
    v.muted = true
    if (playing) v.play().catch(() => setChoice('pause'))
    else v.pause()
  }, [playing, loadVideo])

  return (
    <header data-surface="dark" className="relative flex min-h-[100svh] flex-col overflow-hidden bg-ink text-white">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        src={loadVideo ? '/hero.mp4' : undefined}
        poster="/hero-poster.jpg"
        loop
        muted
        playsInline
        preload="metadata"
        aria-hidden
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/25 to-black/70" />

      <Container className="relative">
        <nav className="flex items-center justify-between py-6" aria-label="Main">
          <span className="text-lg font-bold tracking-tight">Frame&amp;Light</span>
          <a href={`mailto:${CONTACT_EMAIL}?subject=Quote%20request`} className="rounded-full border border-white/60 px-5 py-2 text-sm font-semibold backdrop-blur transition-colors hover:bg-white hover:text-ink">Get a quote</a>
        </nav>
      </Container>

      <Container className="relative flex flex-1 items-end pb-16 pt-12 sm:pb-24">
        <div>
          <h1 className="max-w-5xl text-display font-extrabold leading-[0.98] tracking-tighter">
            We capture the moments that matter.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white sm:text-xl">
            Event coverage, photo and video. Hire our team to cover your event, run a shoot, or produce a film. Edited and delivered in 7 days.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <a href={`mailto:${CONTACT_EMAIL}?subject=Event%20booking`} className="inline-flex items-center gap-3 rounded-full bg-accent px-7 py-4 text-base font-semibold text-white transition-colors hover:bg-accent-dark">
              Book your event <Arrow />
            </a>
            <span className="text-sm font-medium text-white">Free quote within 24 hours</span>
          </div>
        </div>
      </Container>

      <button
        type="button"
        onClick={() => setChoice(playing ? 'pause' : 'play')}
        aria-label={playing ? 'Pause background video' : 'Play background video'}
        className="absolute bottom-5 right-5 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/60 bg-black/40 text-white backdrop-blur transition-colors hover:bg-white hover:text-ink sm:right-8"
      >
        <PlayPauseIcon playing={playing} />
      </button>
    </header>
  )
}

/* ---------- 2. Feature cards ---------- */
const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round' } as const
const features = [
  {
    title: 'Event Coverage',
    text: 'Full-day photo and video coverage of conferences, concerts, weddings and parties.',
    icon: (
      <svg viewBox="0 0 24 24" width="28" height="28" {...stroke} aria-hidden>
        <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" />
      </svg>
    ),
  },
  {
    title: 'Photo Shoot',
    text: 'Portraits, brand and team photography, planned with you and retouched for use.',
    icon: (
      <svg viewBox="0 0 24 24" width="28" height="28" {...stroke} aria-hidden>
        <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" /><circle cx="12" cy="13.5" r="3.5" />
      </svg>
    ),
  },
  {
    title: 'Video Shoot',
    text: 'Highlight reels, promos and interviews, shot in 4K and edited by our team.',
    icon: (
      <svg viewBox="0 0 24 24" width="28" height="28" {...stroke} aria-hidden>
        <rect x="2" y="6" width="14" height="12" rx="2" /><path d="m16 10 6-3v10l-6-3" />
      </svg>
    ),
  },
]

function Features() {
  return (
    <section className="py-section">
      <Container>
        <SectionHead eyebrow="Services" title="What we do" />
        <ul className="mt-12 grid gap-5 md:grid-cols-3">
          {features.map((f) => (
            <li key={f.title} className="flex flex-col rounded-3xl border border-line bg-surface p-8 transition-shadow hover:shadow-lg hover:shadow-black/5">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-tint text-accent">{f.icon}</span>
              <h3 className="mt-8 text-2xl font-bold tracking-tight">{f.title}</h3>
              <p className="mt-3 leading-relaxed text-muted">{f.text}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}

/* ---------- 3. Bento highlights ---------- */
function CyclingTile({ photos, sizes, label, caption, interval, delay, className, paused }: {
  photos: string[]; sizes: string; label: string; caption: string; interval: number; delay: number; className: string; paused: boolean
}) {
  const [i, setI] = useState(0)
  const [hovered, setHovered] = useState(false)
  // Photo 1 loads lazily with the tile. Each later photo is fetched one step ahead of being shown,
  // so a tile never downloads its whole set up front (or at all, while paused).
  const [firstLoaded, setFirstLoaded] = useState(false)
  const [furthest, setFurthest] = useState(0)
  if (i > furthest) setFurthest(i)
  const stopped = paused || hovered
  const shouldRender = (n: number) => n === 0 || n <= furthest || (firstLoaded && !paused && n === furthest + 1)

  useEffect(() => {
    if (stopped) return
    let timer: number | undefined
    const start = window.setTimeout(() => {
      timer = window.setInterval(() => setI((n) => (n + 1) % photos.length), interval)
    }, delay)
    return () => { clearTimeout(start); clearInterval(timer) }
  }, [photos.length, interval, delay, stopped])

  return (
    <figure
      className={`relative overflow-hidden rounded-3xl bg-ink ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* The visible caption names the tile; the rotating photos are illustrative. */}
      {photos.map((id, n) =>
        shouldRender(n) ? (
          <img
            key={id}
            src={img(id, 960)}
            srcSet={srcSet(id)}
            sizes={sizes}
            alt=""
            loading="lazy"
            decoding="async"
            onLoad={n === 0 ? () => setFirstLoaded(true) : undefined}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1600ms] ease-in-out ${n === i ? 'opacity-100' : 'opacity-0'}`}
          />
        ) : null,
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
      <figcaption className="absolute bottom-0 left-0 p-5 text-white sm:p-6">
        <span className="text-xs font-semibold uppercase tracking-widest text-white/90">{label}</span>
        <p className="mt-1 text-lg font-semibold leading-tight">{caption}</p>
      </figcaption>
    </figure>
  )
}

/* Slot widths: full width on mobile; on md+ the grid is 6 columns inside a max-w-6xl container. */
const SIZES_WIDE = '(min-width: 1152px) 720px, (min-width: 768px) 64vw, 100vw'
const SIZES_NARROW = '(min-width: 1152px) 360px, (min-width: 768px) 32vw, 100vw'

const tiles = [
  { label: 'Live events', caption: 'Concerts & festivals', interval: 4500, delay: 0, sizes: SIZES_WIDE, className: 'aspect-[4/3] md:col-span-4 md:row-span-2 md:aspect-auto',
    photos: ['1459749411175-04bf5292ceea', '1524368535928-5b5e00ddc76b', '1501386761578-eac5c94b800a', '1470229722913-7c0e2dbbafd3'] },
  { label: 'Weddings', caption: 'Ceremonies & portraits', interval: 5000, delay: 1200, sizes: SIZES_NARROW, className: 'aspect-[4/5] md:col-span-2 md:row-span-2 md:aspect-auto',
    photos: ['1537633468298-d86f0c2d4173', '1597955750667-3c4fc0c80c97', '1630526720753-aa4e71acf67d', '1652950618856-2f19ae98297c'] },
  { label: 'Video', caption: 'On set with the crew', interval: 5200, delay: 2400, sizes: SIZES_NARROW, className: 'aspect-[4/3] md:col-span-2 md:aspect-auto',
    photos: ['1632187981988-40f3cbaeef5e', '1611784728558-6c7d9b409cdf', '1603126004251-d01882b9bfd3'] },
  { label: 'Crowds', caption: 'Atmosphere & moments', interval: 4800, delay: 3400, sizes: SIZES_NARROW, className: 'aspect-[4/3] md:col-span-2 md:aspect-auto',
    photos: ['1533174072545-7a4b6ad7a6c3', '1540039155733-5bb30b53aa14', '1514525253161-7a46d19cd819'] },
  { label: 'Gear', caption: 'Shot on pro cameras', interval: 5400, delay: 600, sizes: SIZES_NARROW, className: 'aspect-[4/3] md:col-span-2 md:aspect-auto',
    photos: ['1535540878298-a155c6d065ef', '1629756048377-09540f52caa1', '1611550287705-7ff8b459c8eb'] },
]

const roundBtn = 'flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface transition-colors hover:bg-ink hover:text-white disabled:pointer-events-none disabled:opacity-35'

function Highlights() {
  const reduced = usePrefersReducedMotion()
  const [userPaused, setUserPaused] = useState(false)
  const paused = reduced || userPaused

  return (
    <section className="py-section">
      <Container>
        <div className="flex items-end justify-between gap-6">
          <SectionHead eyebrow="Recent work" title="A look at what we deliver" intro="Selected coverage from the past season." />
          {!reduced && (
            <button
              type="button"
              className={`${roundBtn} shrink-0`}
              onClick={() => setUserPaused((p) => !p)}
              aria-label={userPaused ? 'Play slideshow' : 'Pause slideshow'}
            >
              <PlayPauseIcon playing={!userPaused} />
            </button>
          )}
        </div>
        <div className="mt-12 grid grid-cols-1 gap-4 md:auto-rows-[15rem] md:grid-cols-6 md:gap-5">
          {tiles.map((t) => <CyclingTile key={t.label} {...t} paused={paused} />)}
        </div>
      </Container>
    </section>
  )
}

/* ---------- 4. Member carousel ---------- */
const members = [
  { name: 'Maya Chen', role: 'Lead Photographer', photo: '1494790108377-be9c29b29330' },
  { name: 'Daniel Okafor', role: 'Director of Video', photo: '1507003211169-0a1dd7228f2d' },
  { name: 'Elena Rossi', role: 'Event Photographer', photo: '1607503873903-c5e95f80d7b9' },
  { name: 'Jonas Weber', role: 'Cinematographer', photo: '1500648767791-00dcc994a43e' },
  { name: 'Priya Nair', role: 'Video Editor', photo: '1609436132311-e4b0c9370469' },
  { name: 'Marco Silva', role: 'Producer', photo: '1590086782957-93c06ef21604' },
]

function Members() {
  const track = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const reduced = usePrefersReducedMotion()

  const onScroll = useCallback(() => {
    const el = track.current
    if (!el) return
    const items = Array.from(el.children) as HTMLElement[]
    const left = el.scrollLeft
    let best = 0, dist = Infinity
    items.forEach((c, n) => {
      const d = Math.abs(c.offsetLeft - el.offsetLeft - left)
      if (d < dist) { dist = d; best = n }
    })
    if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) best = items.length - 1
    setActive(best)
  }, [])

  const goTo = (n: number) => {
    const el = track.current
    if (!el) return
    const target = el.children[Math.max(0, Math.min(members.length - 1, n))] as HTMLElement
    el.scrollTo({ left: target.offsetLeft - el.offsetLeft, behavior: reduced ? 'auto' : 'smooth' })
  }

  // Touch swiping is native (overflow scroll). This adds click-and-drag for mouse users.
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null)
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const el = track.current
    if (!el || e.pointerType !== 'mouse' || e.button !== 0) return
    drag.current = { x: e.clientX, left: el.scrollLeft, moved: false }
    el.style.scrollSnapType = 'none'
    el.style.scrollBehavior = 'auto'
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = track.current
    const d = drag.current
    if (!el || !d) return
    const dx = e.clientX - d.x
    if (!d.moved && Math.abs(dx) > 4) {
      d.moved = true
      el.setPointerCapture(e.pointerId)
    }
    if (d.moved) el.scrollLeft = d.left - dx
  }
  const endDrag = () => {
    const el = track.current
    const d = drag.current
    drag.current = null
    if (!el || !d) return
    el.style.scrollSnapType = ''
    el.style.scrollBehavior = ''
    if (!d.moved) return
    // Settle on the nearest slide; a short flick (>40px) still advances one slide.
    const pos = (Array.from(el.children) as HTMLElement[]).map((c) => c.offsetLeft - el.offsetLeft)
    const nearestTo = (x: number) => pos.reduce((best, p, n) => (Math.abs(p - x) < Math.abs(pos[best] - x) ? n : best), 0)
    const start = nearestTo(d.left)
    let target = nearestTo(el.scrollLeft)
    const delta = el.scrollLeft - d.left
    if (target === start && Math.abs(delta) > 40) target = start + Math.sign(delta)
    goTo(target)
  }

  const prevNext = (className: string) => (
    <div className={`gap-3 ${className}`}>
      <button type="button" className={roundBtn} onClick={() => goTo(active - 1)} disabled={active === 0} aria-label="Previous member"><Arrow dir="left" /></button>
      <button type="button" className={roundBtn} onClick={() => goTo(active + 1)} disabled={active === members.length - 1} aria-label="Next member"><Arrow /></button>
    </div>
  )

  return (
    <section className="py-section" aria-roledescription="carousel" aria-label="Our team">
      <Container>
        <div className="flex items-end justify-between gap-6">
          <SectionHead eyebrow="The team" title="Meet the people behind the camera" />
          {prevNext('hidden md:flex')}
        </div>
        <div
          ref={track}
          onScroll={onScroll}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
          className="no-scrollbar -mx-5 mt-12 flex cursor-grab snap-x snap-mandatory gap-5 overflow-x-auto px-5 select-none active:cursor-grabbing motion-safe:scroll-smooth sm:-mx-8 sm:px-8"
          style={{ scrollPaddingInline: '1.25rem' }}
        >
          {members.map((m, n) => (
            <div
              key={m.name}
              role="group"
              aria-roledescription="slide"
              aria-label={`${m.name}, ${n + 1} of ${members.length}`}
              className="w-[72%] shrink-0 snap-start sm:w-[44%] md:w-[calc((100%-2.5rem)/3)] lg:w-[calc((100%-3.75rem)/4)]"
            >
              <div className="aspect-[4/5] overflow-hidden rounded-3xl bg-line">
                <img
                  src={img(m.photo, 640)}
                  srcSet={srcSet(m.photo)}
                  sizes="(min-width: 1024px) 270px, (min-width: 768px) 33vw, (min-width: 640px) 44vw, 72vw"
                  alt={`Portrait of ${m.name}`}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className="h-full w-full object-cover"
                />
              </div>
              <h3 className="mt-5 text-xl font-bold tracking-tight">{m.name}</h3>
              <p className="mt-1 text-muted">{m.role}</p>
            </div>
          ))}
        </div>
        {prevNext('mt-10 flex justify-center md:hidden')}
        <div className="mt-6 flex justify-center gap-1 md:mt-10" role="group" aria-label="Choose member">
          {members.map((m, n) => (
            <button
              key={m.name}
              type="button"
              onClick={() => goTo(n)}
              aria-label={`Go to ${m.name}`}
              aria-current={n === active ? 'true' : undefined}
              className="group flex h-6 min-w-6 items-center justify-center rounded-full"
            >
              <span
                aria-hidden
                className={`block h-2 rounded-full transition-all ${n === active ? 'w-8 bg-ink' : 'w-2 bg-muted group-hover:bg-ink'}`}
              />
            </button>
          ))}
        </div>
      </Container>
    </section>
  )
}

export default function App() {
  return (
    <>
      <a
        href="#main"
        className="fixed left-3 top-3 z-50 -translate-y-[200%] rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white focus:translate-y-0"
      >
        Skip to main content
      </a>
      <Hero />
      <main id="main" tabIndex={-1} className="outline-none">
        <Features />
        <Highlights />
        <Members />
      </main>
      <footer className="border-t border-line py-10">
        <Container className="flex flex-wrap items-center justify-between gap-4 text-sm text-muted">
          <span>© Frame&amp;Light. Event photography &amp; videography.</span>
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-ink hover:underline">{CONTACT_EMAIL}</a>
        </Container>
      </footer>
    </>
  )
}
