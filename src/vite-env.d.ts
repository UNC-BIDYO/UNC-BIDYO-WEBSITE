/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL, for the admin panel's sign-in (public, set in Vercel). */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase publishable key (sb_publishable_…), safe to ship to the browser. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  /** Cloudflare Turnstile site key for the booking form's bot check (public). */
  readonly VITE_TURNSTILE_SITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
