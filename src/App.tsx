import { About } from "@/features/about/About";
import { Booking } from "@/features/booking/Booking";
import { Faq } from "@/features/faq/Faq";
import { Hero } from "@/features/hero/Hero";
import { Highlights } from "@/features/highlights/Highlights";
import { Schedule } from "@/features/schedule/Schedule";
import { Services } from "@/features/services/Services";
import { SiteFooter } from "@/features/site-footer/SiteFooter";
import { Team } from "@/features/team/Team";

export default function App() {
  return (
    <>
      <a
        href="#main"
        className="fixed left-3 top-3 z-50 -translate-y-[200%] bg-ink px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-white focus:translate-y-0"
      >
        Skip to main content
      </a>
      <Hero />
      <main id="main" tabIndex={-1} className="outline-none">
        <Services />
        <Highlights />
        <About />
        <Team />
        <Schedule />
        <Faq />
        <Booking />
      </main>
      <SiteFooter />
    </>
  );
}
