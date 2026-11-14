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
