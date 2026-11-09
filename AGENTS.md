# figma-make-app

React + Vite + Tailwind CSS project running inside Figma Make.

## Development Server

A Vite development server is **already running** on `$PORT` (default 8443). You don't need to start it manually.

- Preview URL: The user can access the running app through the preview panel
- Hot reload: Changes to source files are reflected immediately

## Project Structure

This is the canonical project structure. Start with task-relevant files below. Only follow imports or inspect other files when required, when a documented path is missing, or when the repository contradicts this guide.

- `src/main.tsx` - React entrypoint; imports `src/index.css` and mounts `src/App.tsx` into the `#root` element
- `src/App.tsx` - Primary application component and the usual starting point for UI work
- `src/index.css` - Global CSS entrypoint and Tailwind CSS v4 import
- `index.html` - Vite HTML shell containing the `#root` element and loading `src/main.tsx`
- `package.json` - Project dependencies and the Vite build, development, preview, and formatting scripts
- `vite.config.ts` - Vite configuration with React, Tailwind CSS v4, and Figma Make plugins plus the `@` alias for `src`
- `.mise.toml` - Toolchain versions for Node.js and pnpm

## Dependencies

- Runtime: React 19 and React DOM 19
- Styling: Tailwind CSS v4 with the `@tailwindcss/vite` plugin
- Build tooling: Vite 8, TypeScript 5.7, and `@vitejs/plugin-react`
- Formatting: oxfmt

## Styling

This project uses **Tailwind CSS v4** through the `@tailwindcss/vite` plugin configured in `vite.config.ts`. `src/index.css` imports Tailwind with `@import 'tailwindcss';`. Use Tailwind utility classes directly in JSX and put global CSS or Tailwind v4 theme customization in `src/index.css`. This scaffold does not need a Tailwind config file or PostCSS config.

`src/main.tsx` imports `src/index.css`, so global font wiring belongs in `src/index.css`. Keep CSS `@import` statements first, then add any `@font-face` rules and font-family defaults there.

Tailwind emits utility classes in `@layer utilities`, and CSS outside any cascade layer overrides every layer regardless of specificity. Put global element styles, such as resets and defaults for `body`, headings, `button`, or `input`, inside `@layer base { ... }` so utility classes on those elements still apply. Tailwind's Preflight already applies `box-sizing: border-box`, removes default margins, and sets `font: inherit` on form controls, so do not repeat those rules.

## Frontend Guidelines (always follow)

### Visual & Aesthetic Direction
- Ground in the subject matter: make deliberate, opinionated palette, typography and layout choices tied to the project's purpose, not generic templates.
- Avoid cliche defaults: no identical rounded card kits, no soft grey drop shadows (rgba(0,0,0,.1)), no neutral cream/terracotta combos, no standard Inter/Roboto/system fonts.
- Intentional composition: the first viewport reads as one cohesive composition with a clear hero-level brand signal.
- Purposeful motion: use non-user-triggered motion sparingly. Prefer a single orchestrated page-load sequence over scattered fade-and-slide effects on cards/sections. Other motion should answer user actions (expanding, opening, confirming).

### Style Guides & Design Systems
- Build living, interactive style guides: responsive grids, design tokens, type scales, component states (buttons, inputs, modals, navigation).
- Wrap design tokens in typed variant APIs for base elements (e.g. Button); higher-level blocks (Card, Navbar) compose those base components.

### Architecture & Engineering
- Separate feature code (`src/features/<name>/`) from shared code (`src/shared/{ui,hooks,lib}/`) rather than dumping into generic components/pages folders.
- Prioritise performance, accessibility and device-agnosticism; use progressive enhancement (core content must be visible without JS).
- Keep folder structure, naming and state-management patterns predictable and consistent.
