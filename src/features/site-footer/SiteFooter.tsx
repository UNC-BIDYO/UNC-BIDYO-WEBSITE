import { BRAND, CONTACT_EMAIL, mailto } from "@/shared/lib/site";
import { Container } from "@/shared/ui/Container";
import { Logo } from "@/shared/ui/Logo";

export function SiteFooter() {
  return (
    <footer data-surface="dark" className="bg-ink py-12 text-white">
      <Container className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Logo variant="white" className="h-12" />
          <p className="mt-3 text-sm text-muted-dark">
            © {BRAND}. Event photography &amp; videography.
          </p>
        </div>
        <a
          href={mailto()}
          className="font-mono text-sm uppercase tracking-[0.12em] text-white underline decoration-accent-bright decoration-2 underline-offset-8 hover:text-accent-bright"
        >
          {CONTACT_EMAIL}
        </a>
      </Container>
    </footer>
  );
}
