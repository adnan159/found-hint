/**
 * Wraps every component in `src/admin/components/ui/` in `forwardRef`,
 * at build time.
 *
 * Why: the app runs on the React WordPress ships (18.3 at the time of
 * writing), not a bundled copy. shadcn generates these files for React 19,
 * where `ref` is an ordinary prop; on React 18 a ref given to a plain
 * function component is dropped. Base UI hands refs to our components
 * whenever one is its `render` (`render={<Button />}`), and needs them for
 * focus and positioning. `forwardRef` works on React 18 and 19 alike.
 *
 * Done here rather than by hand so the generated files stay untouched — the
 * shadcn CLI can regenerate them without anyone re-adding the wrapper.
 *
 * A top-level `function Name(` (capitalised) becomes `Name__render`, and
 * `const Name = forwardRef(...)` takes its place, so the file's own export
 * list still exports the wrapped component.
 */
const UI_DIR = /[\\/]src[\\/]admin[\\/]components[\\/]ui[\\/][^\\/]+\.jsx$/;
const COMPONENT = /^function ([A-Z]\w*)\(/gm;

/**
 * @param {string} code Source of one ui/ file.
 * @return {string|null} The rewritten source, or null when it has no components.
 */
export function wrapForwardRefs(code) {
  const names = [...code.matchAll(COMPONENT)].map((match) => match[1]);

  if (!names.length) {
    return null;
  }

  let out = code.replace(COMPONENT, "function $1__render(");

  out +=
    '\nimport { forwardRef as __fhintForwardRef } from "react";\n' +
    "function __fhintRef(render, name) {\n" +
    "  const Wrapped = __fhintForwardRef((props, ref) =>\n" +
    "    render(ref ? { ...props, ref } : props),\n" +
    "  );\n" +
    "  Wrapped.displayName = name;\n" +
    "  return Wrapped;\n" +
    "}\n";

  for (const name of names) {
    out += `const ${name} = __fhintRef(${name}__render, "${name}");\n`;
  }

  return out;
}

/** @return {import('vite').Plugin} */
export function forwardRefs() {
  return {
    name: "fhint:forward-refs",
    enforce: "pre",
    transform(code, id) {
      if (!UI_DIR.test(id.split("?")[0])) {
        return null;
      }

      const out = wrapForwardRefs(code);

      return out ? { code: out, map: null } : null;
    },
  };
}
