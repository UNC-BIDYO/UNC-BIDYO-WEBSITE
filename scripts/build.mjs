// Production build with prerendering: `pnpm build` (Figma Make deploys run this too).
//
//   1. Client build        -> dist/ (the normal `vite build`)
//   2. Server build        -> node_modules/.cache/prerender/entry-server.js
//   3. Prerender           -> renders <App /> and writes it into dist/index.html's #root
//
// One script instead of `vite build && ...` because Figma Make's preview deploy runs
// `pnpm run build --mode development`, and pnpm appends that flag to the end of the
// command; here it is passed to both Vite builds.
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "vite";

const args = process.argv.slice(2);
const modeArg = args.findIndex((a) => a === "--mode" || a.startsWith("--mode="));
const mode =
  modeArg === -1
    ? undefined
    : args[modeArg].includes("=")
      ? args[modeArg].split("=")[1]
      : args[modeArg + 1];

const root = process.cwd();
const outDir = resolve(root, "dist");
const ssrOutDir = resolve(root, "node_modules/.cache/prerender");
// Must match `base` in vite.config.ts.
const base = process.env.FIGMA_PUBLIC_URL ? `${process.env.FIGMA_PUBLIC_URL}/` : "/";

// 1. Client
await build({ mode });

// 2. Server bundle of the same app (same config and plugins, so asset URLs match the client's)
await build({
  mode,
  logLevel: "warn",
  build: {
    ssr: "src/entry-server.tsx",
    outDir: ssrOutDir,
    emptyOutDir: true,
    copyPublicDir: false,
    sourcemap: false,
    minify: false,
  },
});

// 3. Prerender into dist/index.html
const { render } = await import(pathToFileURL(resolve(ssrOutDir, "entry-server.js")).href);
const appHtml = render();

const indexPath = resolve(outDir, "index.html");
const template = readFileSync(indexPath, "utf8");
const emptyRoot = '<div id="root"></div>';
if (!template.includes(emptyRoot)) {
  throw new Error(`prerender: ${emptyRoot} not found in dist/index.html`);
}
writeFileSync(indexPath, template.replace(emptyRoot, () => `<div id="root">${appHtml}</div>`));

// Every local file the prerendered HTML points at must exist in dist/.
const urls = [...appHtml.matchAll(/\b(?:src|srcSet|srcset|poster|href)="([^"]+)"/g)]
  .flatMap((m) => m[1].split(",").map((part) => part.trim().split(/\s+/)[0]))
  .filter((url) => url.startsWith(base) && !url.startsWith("//"));
const missing = [...new Set(urls)].filter(
  (url) => url !== base && !existsSync(resolve(outDir, decodeURI(url.slice(base.length)))),
);
if (missing.length) {
  throw new Error(`prerender: HTML references files missing from dist/:\n  ${missing.join("\n  ")}`);
}

rmSync(ssrOutDir, { recursive: true, force: true });
console.log(
  `\nprerender: wrote ${(appHtml.length / 1024).toFixed(1)} kB of HTML into dist/index.html ` +
    `(${new Set(urls).size} asset URLs checked)`,
);
