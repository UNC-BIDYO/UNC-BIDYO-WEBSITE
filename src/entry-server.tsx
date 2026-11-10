import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import App from "./App";

/* Used only at build time by scripts/build.mjs to prerender the page into dist/index.html.
   It renders the same tree as main.tsx, so the browser can hydrate it without mismatches. */
export function render() {
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
