import { useEffect, useRef } from "react";
import { useHydrated } from "@/shared/hooks/useHydrated";

/* Cloudflare Turnstile bot check. Renders nothing unless VITE_TURNSTILE_SITE_KEY is set; the
   script loads only after hydration, so it never delays the page. The widget adds a hidden
   "cf-turnstile-response" input to the surrounding form, which /api/book verifies. */
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<TurnstileApi> | null = null;
function loadTurnstile(): Promise<TurnstileApi> {
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () =>
      window.turnstile ? resolve(window.turnstile) : reject(new Error("no turnstile"));
    script.onerror = () => reject(new Error("Turnstile failed to load"));
    document.head.append(script);
  });
  return scriptPromise;
}

/** `resetKey` changes after each submission, since a token can only be used once. */
export function Turnstile({ resetKey }: { resetKey: number }) {
  const hydrated = useHydrated();
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);

  useEffect(() => {
    if (!SITE_KEY || !hydrated || !box.current) return;
    let cancelled = false;
    loadTurnstile()
      .then((api) => {
        if (cancelled || !box.current) return;
        widget.current = api.render(box.current, {
          sitekey: SITE_KEY,
          theme: "dark",
          size: "flexible",
          "response-field-name": "cf-turnstile-response",
        });
      })
      .catch((e: Error) => console.warn(`Booking form: ${e.message}`));
    return () => {
      cancelled = true;
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, [hydrated]);

  useEffect(() => {
    if (resetKey && widget.current) window.turnstile?.reset(widget.current);
  }, [resetKey]);

  if (!SITE_KEY) return null;
  return <div ref={box} className="min-h-[65px]" aria-label="Security check" role="group" />;
}
