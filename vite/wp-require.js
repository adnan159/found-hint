/**
 * Gives CommonJS dependencies WordPress's React.
 *
 * `wp_scripts()` swaps `import ... from "react"` for `window.React`, but a
 * CommonJS package bundled in (react-redux's use-sync-external-store) calls
 * `require("react")`, which the bundler leaves to a runtime `require` — there
 * is none in a browser, so the bundle would throw on load. This defines one,
 * at the top of the bundle's module scope, for the WordPress globals only.
 */
const GLOBALS = {
  react: "window.React",
  "react-dom": "window.ReactDOM",
  "react-dom/client": "window.ReactDOM",
  "react/jsx-runtime": "window.ReactJSXRuntime",
};

/** @return {import('vite').Plugin} */
export function wpRequire() {
  const map = Object.entries(GLOBALS)
    .map(([id, global]) => `${JSON.stringify(id)}: ${global}`)
    .join(", ");

  const banner =
    `const require = (id) => {\n` +
    `  const found = { ${map} }[id];\n` +
    `  if (!found) throw new Error("FoundHint: no WordPress global for " + id);\n` +
    `  return found;\n` +
    `};\n`;

  return {
    name: "fhint:wp-require",
    apply: "build",
    config() {
      return { build: { rollupOptions: { output: { banner } } } };
    },
  };
}
