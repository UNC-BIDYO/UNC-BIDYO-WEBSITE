import { CONTACT_EMAIL, SOCIAL_LINKS, mailto } from "@/shared/lib/site";
import { Container } from "@/shared/ui/Container";
import { Logo } from "@/shared/ui/Logo";

const linkStyle =
  "font-mono text-sm uppercase tracking-[0.12em] text-white underline decoration-accent-bright decoration-2 underline-offset-8 hover:text-accent-bright";

export function SiteFooter() {
  const socials = SOCIAL_LINKS.filter((s) => s.href);
  return (
    <footer data-surface="dark" className="border-t border-white/15 bg-ink py-12 text-white">
      <Container className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Logo variant="white" className="h-12" />
          <p className="mt-3 text-sm text-muted-dark">Capturing the moments of every UNCean.</p>
        </div>
        <div className="flex flex-col gap-5 sm:items-end">
          {socials.length > 0 && (
            <nav aria-label="Social media">
              <ul className="flex flex-wrap gap-x-6 gap-y-3">
                {socials.map((s) => (
                  <li key={s.label}>
                    <a href={s.href} rel="me noopener" className={linkStyle}>
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          <a href={mailto()} className={linkStyle}>
            {CONTACT_EMAIL}
          </a>
        </div>
      </Container>
    </footer>
  );
}
