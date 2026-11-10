// Production build with prerendering: `pnpm build` (Figma Make deploys run this too).
//
//   1. Client build        -> dist/ (the normal `vite build`)
//   2. Server build        -> node_modules/.cache/prerender/entry-server.js
//   3. Prerender           -> renders <App /> into dist/index.html's #root and preloads
//                             the headline font
//
// One script instead of `vite build && ...` because Figma Make's preview deploy runs
// `pnpm run build --mode development`, and pnpm appends that flag to the end of the
// command; here it is passed to both Vite builds.
import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
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

// Images and video are stored in Git LFS (.gitattributes). A checkout without LFS gets ~130-byte
// text "pointer" files instead; photos then fail in vite-imagetools, but files that are only
// copied (public/hero.mp4, the poster, the logos) would ship broken. Fail loudly instead.
const LFS_POINTER = "version https://git-lfs.github.com/spec/v1";
const pointers = readdirSync(outDir, { recursive: true, withFileTypes: true })
  .filter((e) => e.isFile())
  .map((e) => resolve(e.parentPath, e.name))
  .filter((file) => statSync(file).size < 1024 && readFileSync(file, "utf8").startsWith(LFS_POINTER));
if (pointers.length) {
  throw new Error(
    "build: these files are Git LFS pointers, not real files. Fetch LFS content first " +
      "(`git lfs pull`, or `lfs: true` in actions/checkout):\n  " +
      pointers.map((f) => f.slice(outDir.length + 1)).join("\n  "),
  );
}

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
// Preload the headline font (the hero <h1> is the LCP element), so it usually arrives before
// first paint instead of swapping in later. Its file name carries a content hash, so find it.
const antonFile = readdirSync(resolve(outDir, "assets")).find((f) =>
  /^anton-latin-400-normal-[\w-]+\.woff2$/.test(f),
);
if (!antonFile) throw new Error("prerender: bundled Anton .woff2 not found in dist/assets/");
const fontPreload = `<link rel="preload" href="${base}assets/${antonFile}" as="font" type="font/woff2" crossorigin>`;

writeFileSync(
  indexPath,
  template
    .replace(emptyRoot, () => `<div id="root">${appHtml}</div>`)
    .replace("</head>", () => `  ${fontPreload}\n  </head>`),
);

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
