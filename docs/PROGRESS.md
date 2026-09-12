# Progress

**The single source of truth for step status.** Update this file whenever a
step finishes — mirrors the workflow in `local-seo/docs/PROGRESS.md`: move
the step from pending to done, write one line on what shipped and one on how
it was verified, update FEATURES.md/CHANGELOG.md if those exist yet, and
note anything non-obvious in DECISIONS.md.

Last updated: scaffold only. No domain steps have started.

## Step 0 · Scaffold — done

Directory structure, tooling, and boot sequence set up, following
`abandoned-cart-recovery-for-woocommerce`'s frontend/build layout with
`local-seo`'s PHP layering carried over into `includes/`.

Shipped:
- `found-hint.php` bootstrap, Composer PSR-4 autoload (`FHINT\` →
  `includes/`), constants, activation/deactivation wiring to a
  `Lifecycle` stub.
- `includes/Support/{Container,Extensions,Registry,ServiceProvider}.php`
  and `includes/Contracts/ServiceProviderInterface.php`, ported from
  `local-seo`.
- `includes/Plugin.php` — boot sequence (register → extensions → boot),
  currently wiring only `AdminServiceProvider`.
- `includes/Infrastructure/WordPress/Capabilities.php` (`manage_fhint`)
  and a `Lifecycle.php` stub (no DB installer yet).
- `includes/Presentation/Admin/{Menu,Enqueue,AdminServiceProvider}.php` —
  one top-level WP admin page, hash-routed submenu entries, Vite asset
  loading gated to that page's hook suffix.
- `src/admin/` — Vite + React + Redux Toolkit + RTK Query + shadcn/ui
  scaffold: `main.jsx`, `App.jsx`, `routes.jsx` (hash router), a
  placeholder `Sidebar` layout, one placeholder page per planned screen
  (dashboard, business, locations, services, schema, audit, gbp,
  settings), `store/` (baseApi + uiSlice), Tailwind v4 `index.css` with
  the FoundHint brand tokens (`#FF6B35` primary, dark sidebar).
- Root tooling: `package.json`, `composer.json`, `vite.admin.config.js`,
  `components.json`, `tsconfig.json`/`jsconfig.json`, `eslint.config.js`,
  `.prettierrc`/`.prettierignore`, `.gitignore`, `phpcs.xml.dist`,
  `scripts/build.cjs` + `scripts/zip.cjs`, `libs/assets.php` (vite-for-wp).
- `docs/ARCHITECTURE.md`, this file, `docs/NAVIGATION.md`.

**Not done:** `composer install` / `npm install` have not been run in this
tree yet — no `vendor/` or `node_modules/` exist, so nothing has actually
booted against a live WordPress install. That's the first thing to verify
before writing any domain code.

**Verify before building further:**
1. `composer install && npm install`
2. Symlink/copy into a WP install's `wp-content/plugins/`, activate.
3. Confirm the FoundHint top-level admin menu appears, the page renders
   `#found-hint-app`, and `npm run dev` (or a production `npm run build`)
   actually mounts the placeholder Dashboard with no console errors.
4. Confirm the admin bundle does **not** load on any other wp-admin screen
   (grep the HTML for `found-hint-admin`).

## Pending

No steps are numbered yet. Once the scaffold is verified against a real
WordPress install, port `local-seo`'s step sequence
(`local-seo/docs/ROADMAP.md`) adapted to this repo's `includes/` root:
Database → Domain → Infrastructure repositories → Application services →
REST → Admin screens → Schema engine → Audit engine → the rest. Number
steps here as they're scoped, the same way `local-seo` did.
