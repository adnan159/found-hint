/**
 * The build step that lets shadcn's React 19-style components take refs on
 * WordPress's React 18 (vite/forward-refs.js).
 *
 * Usage: node tests/Vite/forward-refs.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { wrapForwardRefs } from "../../vite/forward-refs.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(import.meta.url);
const React = require("react");

let passed = 0;
let failed = 0;

function check(ok, label) {
  if (ok) {
    passed++;
  } else {
    failed++;
    console.log(`  FAIL  ${label}`);
  }
}

// 1. Every component in every ui/ file comes out wrapped.
const dir = path.join(root, "src/admin/components/ui");

for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".jsx"))) {
  const code = fs.readFileSync(path.join(dir, file), "utf8");
  const names = [...code.matchAll(/^function ([A-Z]\w*)\(/gm)].map((m) => m[1]);
  const out = wrapForwardRefs(code) || code;

  for (const name of names) {
    check(!new RegExp(`^function ${name}\\(`, "m").test(out), `${file}: ${name} no longer a bare function`);
    check(out.includes(`const ${name} = __fhintRef(${name}__render, "${name}");`), `${file}: ${name} is wrapped`);
  }
}

// 2. The wrapper hands the ref on, as a prop, to the component's render —
//    which spreads it onto the element that needs it.
const sample = wrapForwardRefs(
  'function Thing({ label, ...props }) {\n  return { label, props };\n}\nexport { Thing };\n',
);
const body = sample
  .replace(/^export \{[^}]*\};$/m, "")
  .replace(/^import \{ forwardRef as __fhintForwardRef \} from "react";$/m, "const __fhintForwardRef = React.forwardRef;");
const Thing = new Function("React", `${body}\nreturn Thing;`)(React);
const ref = { current: null };

check(Thing.$$typeof === Symbol.for("react.forward_ref"), "a wrapped component is a forwardRef component");
check(Thing.displayName === "Thing", "it keeps its name for React DevTools");
check(Thing.render({ label: "a" }, ref).props.ref === ref, "the ref reaches the render as a prop");
check(!("ref" in Thing.render({ label: "a" }, null).props), "no ref, no ref prop");

// 3. Files without components are left alone.
check(wrapForwardRefs('const buttonVariants = cva("x");\n') === null, "a file with no component is not touched");

console.log(`Forward refs: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
