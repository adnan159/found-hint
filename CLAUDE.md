# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## What this is

**FoundHint** — a WordPress plugin that builds a local SEO command center:
business profile, locations, services, JSON-LD schema, an audit with a
score, and (planned) Google Business Profile sync and ranking tracking.

This repository is a deliberate merge of two sibling codebases and carries
conventions from both — know which one governs which part of the tree:

- **Layering and domain conventions** come from the `local-seo` plugin
  (same parent directory). Domain/Application/Infrastructure/Presentation,
  the container, extension registries, the security/DB/REST rules below —
  all carried over close to verbatim. `local-seo/docs/` and
  `local-seo/CLAUDE.md` are the canonical source for that layering; when in
  doubt about a domain-layer question this file doesn't answer, read there.
- **Tooling and the admin frontend** come from
  `abandoned-cart-recovery-for-woocommerce` (same parent directory):
  Composer PSR-4 + PHPCS, Vite + React + Redux Toolkit + shadcn/ui admin
  SPA with client-side (hash) routing under one WP admin page.

This is currently a **scaffold** — the directory structure, boot sequence,
build tooling, and a placeholder admin shell exist; almost no domain logic
does yet. Build it out the way `local-seo` was built: one layer, one
service provider, one REST resource, one page at a time, updating
docs/PROGRESS.md as steps land.

## Commands

```bash
npm run dev              # Vite dev server for the admin React SPA (vite.admin.config.js)
npm run build            # Production build of the admin SPA → assets/build/admin
npm run lint              # eslint over src/
npm run plugin:prepare    # build + copy everything (minus buildExclude globs in package.json) into ./build
npm run plugin:publish    # plugin:prepare + zip ./build into found-hint.zip
composer install          # installs dev tooling (PHPCS + WPCS) — no runtime PHP deps
composer lint              # vendor/bin/phpcs — WordPress Coding Standards check (see phpcs.xml.dist)
composer lint:fix           # vendor/bin/phpcbf — auto-fix what's mechanically fixable
```

There is no PHPUnit setup and no JS test framework configured yet (mirror
`local-seo`'s `tests/Smoke/*` approach — plain-PHP scripts plus `wp eval-file`
— once there's domain logic worth testing). To see a change working, the
plugin must run inside an actual WordPress install; there's no standalone
way to boot it.

## Architecture

### PHP bootstrap

`found-hint.php` defines the singleton `FoundHint` class (`fhint()`),
which defines constants, requires the Composer autoloader, and on
`plugins_loaded` calls `\FHINT\Plugin::instance()->boot()`.

`includes/Plugin.php` owns the container and extension registries and runs
the boot sequence — **this order is deliberate**, mirrored from
`local-seo/docs/ARCHITECTURE.md`:

```
Plugin::boot()
 ├─ load_textdomain()
 ├─ Capabilities::register()          (grants manage_fhint)
 ├─ instantiate providers             (filter: fhint_service_providers)
 ├─ provider->register() for ALL      (bind only — no hooks yet)
 ├─ Extensions::register_extensions() (action: fhint_register_extensions)
 ├─ provider->boot() for ALL          (attach hooks)
 └─ action: fhint_loaded
```

All `register()` before any `boot()` so providers never depend on each
other's load order. Extensions fire between them so add-ons (a future Pro
plugin) contribute to registries after core has filled them and before
anything reads them. `default_providers()` in `includes/Plugin.php`
currently lists only `AdminServiceProvider` — add
`DatabaseServiceProvider`, `ApplicationServiceProvider`,
`RestServiceProvider`, etc. there as those layers get built out.

### Layers and dependency direction

```
Presentation  →  Application  →  Domain
      ↘              ↘
        Infrastructure
```

| Layer | Path | May depend on | Must never |
|---|---|---|---|
| Domain | `includes/Domain/` | nothing | touch `$wpdb`, REST, admin, React |
| Application | `includes/Application/` | Domain, Infrastructure contracts | render markup, read `$_POST` |
| Infrastructure | `includes/Infrastructure/` | Domain | contain business rules |
| Presentation | `includes/Presentation/` | Application | contain business rules or run SQL |

**One deliberate structural difference from `local-seo`:** PHP lives under
`includes/`, not `src/` — `src/` is reserved for the Vite-built admin
frontend (`src/admin/`), matching `abandoned-cart-recovery-for-woocommerce`'s
layout. Composer PSR-4 maps `FHINT\` → `includes/` (see `composer.json`)
— there is no hand-rolled autoloader here, unlike `local-seo`'s
`src/Autoloader.php`.

Everything else about the layering carries over: domain classes return
error codes, never sentences (`business.name.required`, not "Please enter a
business name"); a domain class may only touch a WordPress function through
a `function_exists()`-guarded extension hook; `includes/Support/Container.php`,
`Extensions.php`, `Registry.php`, `ServiceProvider.php` and
`includes/Contracts/ServiceProviderInterface.php` are ported near-verbatim
from `local-seo/src/Support/` and `local-seo/src/Contracts/` — read those
files' docblocks rather than this one for how they work.

### Extension registries

`FHINT\Support\Extensions` holds named `Registry` instances:
`schema_providers`, `audit_rules`, `fix_handlers`, `blocks`, `map_providers`,
`admin_pages`, `rest_routes`. Unknown names are created on demand. A future
Pro plugin contributes during `fhint_register_extensions`, exactly as
described in `local-seo/docs/EXTENDING.md`.

### Capabilities

`manage_fhint` is granted at runtime via `user_has_cap` to anyone who
can `manage_options` — nothing is written to role records (see
`includes/Infrastructure/WordPress/Capabilities.php`). Filter with
`fhint_manage_capability`.

## PHP rules (unchanged from local-seo)

- **PHP 7.4 minimum.** No `enum`, no constructor property promotion, no
  `match`, no named arguments.
- **WordPress Coding Standards**, checked by `composer lint` (PHPCS +
  WordPress-Extra + PHPCompatibilityWP, see `phpcs.xml.dist`). Tabs,
  `snake_case` methods/functions, `array()` over `[]` in PHP files.
- One class per file. Namespace maps to path: `FHINT\Domain\Location\Address`
  → `includes/Domain/Location/Address.php`.
- Every PHP file starts with `defined( 'ABSPATH' ) || exit;`.
- Prefixes: constants `FHINT_`, options `fhint_`, hooks
  `fhint_`, tables `{$wpdb->prefix}fhint_`, text domain `found-hint`,
  REST namespace `fhint/v1`.
- Never `new` a service inside another service. Register it in a provider
  and resolve from the container.

### Security — non-negotiable

- Every `$wpdb` call with a variable goes through `$wpdb->prepare()`. Table
  names cannot be prepared; resolve them through `fhint_table()` (see
  `includes/functions.php`) or a future `Tables` class, never hardcoded.
- Every admin screen and REST route checks `Capabilities::manage()`.
- Every state-changing request checks a nonce (`X-WP-Nonce` for REST).
- Sanitize on input, escape on output — both, every time.
- Domain `validate()` runs server-side on every write, regardless of what
  the React form already checked.
- Never log secrets, tokens, or credentials.

## Database rules (unchanged from local-seo)

- Entity data goes in custom tables (`{$wpdb->prefix}fhint_*`). `wp_options`
  holds **preferences only**.
- **dbDelta formatting is load-bearing** once tables exist: one field per
  line, two spaces in `PRIMARY KEY  (id)`, uppercase `KEY`, every key named.
  After any schema change, re-run the dbDelta idempotency check — it must
  return an empty array against an up-to-date database.
- No foreign keys. Referential integrity lives in the repositories.
- Timestamps stored as UTC (`current_time( 'mysql', true )`).
- **DDL never runs on a front-end request.** Only activation and
  `admin_init`.

## Admin React SPA

### Stack — deliberately different from local-seo

`local-seo`'s admin used `@wordpress/element` + `@wordpress/components` +
`@wordpress/api-fetch` with **no client-side router** (one real WP submenu
page per screen). FoundHint's admin is a **Vite-built React SPA with its
own React copy**, matching `abandoned-cart-recovery-for-woocommerce`:

| Concern | Use |
|---|---|
| React | `react` / `react-dom` (bundled by Vite, not `@wordpress/element`) |
| Routing | `react-router` (`createHashRouter`) — client-side, under one WP page |
| Components | shadcn/ui (`src/admin/components/ui/`) + Radix/base-ui primitives |
| State | Redux Toolkit + RTK Query (`src/admin/store/`) |
| HTTP | RTK Query's `fetchBaseQuery`, nonce read from `window.FHINT` |
| i18n | `@wordpress/i18n` (`__()`) — kept, even though the rest of the React stack isn't WP-native |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`), prefixed `fhint:` (see `components.json`) |
| Build | Vite (`vite.admin.config.js`) via `@kucrut/vite-for-wp` |

**Why the deviation:** the user asked FoundHint's frontend to be structured
like `abandoned-cart-recovery-for-woocommerce`, including its
single-page-app-with-client-router shape — this is an explicit, deliberate
choice, not an oversight. If a future decision reverts to `local-seo`'s
server-registered-pages rule, this section and `includes/Presentation/Admin/Menu.php`
both need to change together.

### Rules carried over unchanged

- **REST is the only data path.** No `admin-ajax`, no form POSTs.
- **Bootstrap the first paint.** `Enqueue::bootstrap_data()` → `wp_localize_script`
  → `window.FHINT`, read by `src/admin/store/api/baseApi.js`. Never put
  secrets there — it is page source.
- **Assets load on our screen only.** `Enqueue` gates on the exact hook
  suffix `Menu` captured from `add_menu_page()` — verify by loading an
  unrelated admin page and grepping the HTML for `found-hint-admin`.
- **Field errors come from the server.** REST returns domain error codes;
  the client maps them (add an `i18n/errors.js` under `src/admin/` once
  there are error codes to map, mirroring `local-seo`'s).
- **Every string through `__()`** with the `found-hint` text domain.
- **Accessibility is a requirement.** Labels on every control, visible
  focus states, `aria-live` for save/error notices, focus moved to the
  heading on route change, never color-alone status.

### Layout

```
src/admin/
├── main.jsx             mounts the React root into #found-hint-app
├── App.jsx               ThemeProvider + RouterProvider
├── routes.jsx            createHashRouter — keep in sync with Menu.php submenus
├── index.css              Tailwind v4 + shadcn tokens, fhint: prefix
├── layouts/root/          shell (Sidebar today; adjust as the real IA lands)
├── pages/                 one folder per screen, index.jsx entry
├── components/ui/         shadcn/ui primitives (add via shadcn CLI)
├── components/            shared non-ui components
├── store/                 Redux Toolkit store, RTK Query api slices
└── lib/utils.js            cn() (clsx + tailwind-merge)
assets/build/               generated by Vite, gitignored — never hand-edit
assets/static/               hand-written, directly-enqueued files, no build step
```

### Commands and build facts

- `npm run build` before every commit that touches `src/admin/`. Unlike
  `local-seo`, `assets/build/` is **gitignored** here (matches
  `abandoned-cart-recovery-for-woocommerce`) — `npm run plugin:prepare` /
  `plugin:publish` are what produce a distributable build.
- shadcn/ui primitives: add with the shadcn CLI (`components.json` is
  already configured, `prefix: "fh"`, `style: "base-vega"`), don't
  hand-roll a component that already exists in the library.
- Tailwind classes are prefixed `fhint:` everywhere (`fhint:flex`, `fhint:text-sm`,
  dark-mode via the `dark` class per `index.css`'s `@custom-variant`).

## Brand

Product name in the UI: **FoundHint**. Primary accent `#FF6B35` (orange),
sidebar dark/near-black — carried over from the FoundHint HTML prototype;
see project memory (`project_ui_prototype_foundhint`) and
`docs/NAVIGATION.md` for the fuller design-decision record (dashboard card
composition, the Free/Pro gating pattern with greyed "PRO ONLY" rows, copy
tone). Treat that prototype as a visual/copy reference, not a functional
spec — most of its sidebar sub-links didn't actually navigate.

## REST rules (unchanged from local-seo)

- Namespace `fhint/v1`. Routes registered from
  `includes/Presentation/REST/` (empty scaffold today).
- Every route needs a real `permission_callback` — `__return_true` is a bug.
- Declare `args` with `sanitize_callback` and `validate_callback`.
- `WP_Error` with a machine code and correct HTTP status (400 validation,
  403 capability, 404 missing, 409 conflict).

## Performance rules (unchanged from local-seo)

- Audits never run on a front-end request.
- Cache schema output and audit results; invalidate on write.
- No external HTTP during page rendering, ever.
- Watch for N+1 queries.

## Never do

- Mix business logic into `includes/Presentation/` or `includes/Infrastructure/`.
- Store entity data in `wp_options`.
- Skip the domain `validate()` because the React form already checked.
- Load the admin bundle on any page other than the one `Menu` registers.
- Commit a `.env`, credentials, or an API key.
- Hardcode a table name instead of going through `fhint_table()`.
