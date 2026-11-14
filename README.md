# UNC Bidyo website

Public site and booking system for UNC Bidyo, the University of Nueva Caceres photo and video organization.

- **Site:** a prerendered single page. It covers Services, Highlights, About, Team, the "Booked days" schedule, FAQ, and the booking form.
- **Admin panel (`/admin`):** officers review requests and approve or disapprove them. Approved requests sync to Google Calendar.

**Stack:** React 19, Vite 8, Tailwind CSS v4, shadcn/ui, TypeScript. Vercel serverless functions in `api/` connect to Supabase (Postgres, Storage, Auth), Resend (email) and the Google Calendar API.

## Getting started

```sh
pnpm install          # also installs the pre-commit hook
pnpm dev              # site at http://localhost:8443, admin at /admin.html
pnpm build            # production build + prerender into dist/
```

The `api/` functions only run on Vercel (or `vercel dev`). Setup for Supabase, Resend, Google Calendar and the environment variables is in [`supabase/README.md`](supabase/README.md).

## Quality checks

| Command | What it does |
| --- | --- |
| `pnpm check` | Everything CI runs, except the build |
| `pnpm typecheck` | `tsc` (strict; unused code is an error) |
| `pnpm lint` / `pnpm lint:fix` | oxlint (`.oxlintrc.json`) |
| `pnpm format` / `pnpm format:check` | oxfmt for `src`, `api`, `scripts`, `tests` |
| `pnpm test` / `pnpm test:coverage` | Vitest (`tests/`); external services are stubbed |

The pre-commit hook (husky + lint-staged) lints and formats the staged files. CI runs typecheck, lint, tests with coverage, the format check and the build on every PR.

## Where things go

| Path | Contents |
| --- | --- |
| `src/features/<feature>/` | One folder per site section or app area (booking, schedule, admin…): its components, hooks and data |
| `src/shared/ui/` | Site-wide UI (`Button`, `Field`, `SectionHead`…) |
| `src/shared/ui/primitives/` | shadcn/ui components, added with `pnpm dlx shadcn@latest add`. Keep shadcn's kebab-case names, and fix any `import { cn } from "cn"` to `@/shared/lib/utils` |
| `src/shared/{hooks,lib}/` | Shared hooks (`useX.ts`) and helpers (`cn`, dates, site constants) |
| `src/admin/`, `admin.html` | Admin panel entry and its stock shadcn stylesheet |
| `api/` | Vercel functions (one file per route) |
| `api/_lib/` | Server modules shared by the functions. Files starting with `_` aren't deployed. The front end imports the shared contract (rules, booking types, site constants) through `@api/*`. Inside `api/`, use relative imports ending in `.js` |
| `tests/` | Vitest tests. They can't live in `api/`, because every non-`_` file there becomes a deployed function |
| `supabase/` | `schema.sql`, `migrations/`, setup guide |
| `public/` | Files served as-is (video, poster, icons, email logo) |
| `scripts/build.mjs` | Production build with prerendering |

**Naming:**
- React components: `PascalCase.tsx`, one component per file.
- Hooks: `useThing.ts`.
- Other modules: `camelCase.ts`.

## Booking-form protection

The public form emails the address typed into it, so it's protected against abuse:

- **Per-address limit:** at most 3 requests per email address per hour. Always on.
- **Cloudflare Turnstile:** a free, mostly invisible bot check. Off until you add its keys:
  1. In the [Cloudflare dashboard](https://dash.cloudflare.com/) → **Turnstile → Add widget**, add the domains `uncbidyo.org` and `uncbidyo.vercel.app`, with mode **Managed**.
  2. In Vercel (Production + Preview), add `VITE_TURNSTILE_SITE_KEY` (the site key) and `TURNSTILE_SECRET_KEY` (the secret key), then redeploy.

  With the secret set, requests without a valid token are rejected, so the form then needs JavaScript. Visitors without it are shown the contact email instead.

## SonarCloud

`sonar-project.properties` and the last CI step run [SonarCloud](https://sonarcloud.io) analysis, which is free for public repos. To turn it on:

1. Sign in to sonarcloud.io with GitHub, then **+ → Analyze new project**. Import `UNC-BIDYO/UNC-BIDYO-WEBSITE` into an organization with the key `unc-bidyo` (or change `sonar.organization` and `sonar.projectKey` to match).
2. In the project, go to **Administration → Analysis Method** and turn **off** Automatic Analysis, so CI can upload test coverage.
3. Go to **My Account → Security → Generate token**, then add it to GitHub under **Settings → Secrets and variables → Actions → New repository secret**, named `SONAR_TOKEN`.

The next CI run then reports to SonarCloud. Suggested quality gate, applied to new code ("Sonar way"):
- no new bugs or vulnerabilities;
- all security hotspots reviewed;
- duplication ≤ 3%;
- coverage ≥ 80%.