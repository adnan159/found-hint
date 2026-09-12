# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## What this is

**FoundHint** — a WordPress plugin that builds a local SEO command center:
business profile, locations, services, JSON-LD schema, an audit with a
score, and (planned) Google Business Profile sync and ranking tracking.

The PHP side is a flat set of top-level **modules**, each a thin dispatcher
class with a static `init()` owning one subdirectory of classes. The admin
is a Vite-built React SPA mounted on a single WordPress admin page.

The data layer (business, locations, opening hours, services) and its REST
API are built. The audit engine, schema output and the admin screens are
not — see `docs/PROGRESS.md` for exactly what is done and what is next.

The sibling `local-seo` plugin in this same directory is the reference for
the *product*: its `docs/DATABASE.md`, `API.md` and `FEATURES.md` describe
the model and the features this plugin grows into. Take the requirements
from there; the structure is defined here.

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

```bash
php tests/Smoke/domain-logic.php    # validation, hours parsing, limits, redaction — no DB
php tests/Smoke/schema-format.php   # dbDelta formatting rules on every table definition
php tests/Smoke/rest-routes.php     # every route is registered and guarded
```

The smoke suites run on plain PHP against stubbed WordPress
(`tests/Smoke/bootstrap.php`), so a failure is a real logic bug rather than
an environment problem. They cover what can be proved without a database;
**anything touching `$wpdb` still needs a real WordPress install**, and the
repositories have not yet been exercised against one — see
`docs/PROGRESS.md`.

When you add a test, mutate the code it covers and confirm the test fails.
A test that passes against broken code is worse than no test, because it
buys confidence it hasn't earned.

## Architecture

### PHP bootstrap and module dispatch

`found-hint.php` defines the singleton `FHINT` class (`fhint()`), which on
`plugins_loaded` fires `fhint_loaded`, which calls `init_plugin()` →
`dispatch_hooks()`. That method is the single source of truth for which
top-level modules exist:

```
FHINT\App\Core\Capabilities::init();  // grants manage_fhint via user_has_cap
FHINT\Installer::check_update();      // version-gated dbDelta migrations
FHINT\Database::init();               // table creation + init-hook wiring
FHINT\API::init();                    // registers all REST controllers
FHINT\Frontend::init();
FHINT\Admin::init();                  // only if is_admin()
```

Every top-level namespace (`API`, `Frontend`, `Admin`, `Database`) follows
the same pattern: a thin dispatcher class with a static `init()` that
instantiates one class per sub-concern and calls its hook-registration
method (`register_routes()` via `rest_api_init` for REST controllers).
**When adding a capability, add a new class under the matching
`includes/<Module>/` directory and register it in the parent dispatcher —
don't bolt more logic onto an existing unrelated class.**

There is no admin-ajax module: **REST is the only data path.**

Autoloading: `FHINT\` → `includes/`, `FHINT\Libs\` → `libs/` (Composer
PSR-4, see `composer.json`). `includes/functions.php` holds only non-class
global helpers (`fhint_setting()`, `fhint_rest_url()`, `fhint_table()`);
`includes/hooks.php` holds only truly global hook wiring with no natural
owner.

### Directory map

```
includes/
├── API.php                 dispatcher + namespace/version/route-name constants
├── API/                    one WP_REST_Controller subclass per resource
├── Admin.php               dispatcher (is_admin() only)
├── Admin/Menu.php          the single top-level page that mounts the SPA
├── Admin/Enqueue.php       Vite bundle loading, gated to our own screen
├── App/Core/               cross-cutting: Settings, Capabilities, Limits, Logger, Validator
├── App/<Domain>/           business logic, one folder per domain area
├── Database/Tables.php     the one place a table name is spelled out
├── Database.php            create_tables() + init-hook wiring
├── Database/               one Create<Name>Table class per table
├── Frontend.php            dispatcher (public requests)
├── Frontend/               public-facing handlers
├── Installer.php           activation + version-gated migrations
├── functions.php           global non-class helpers only
└── hooks.php               global hook wiring only
src/admin/                  Vite-built React SPA (see below)
assets/build/               Vite output, gitignored — never hand-edit
assets/static/              hand-written, directly-enqueued, no build step
libs/assets.php             vite-for-wp integration (FHINT\Libs\Assets)
```

Business logic belongs in `includes/App/<Domain>/` — one folder per domain
area, e.g. `App/Business/`, `App/Location/`, `App/Service/`. Dispatchers
and controllers stay thin: a REST controller validates and delegates, it
doesn't hold rules.

### Database

All custom tables live in `includes/Database/Create*Table.php`, each a
single static `up( $prefix, $charset_collate )` that runs `dbDelta()`.
`Database::create_tables()` runs them all; `Installer` handles version-gated
migrations (`maybe_run_migrations()`) for existing installs — schema changes
that dbDelta can't express (DROP COLUMN, backfills) go there, each guarded
by a live column check so it's safe to call repeatedly.

Rules that apply to every table:

- Entity data goes in custom tables; `wp_options` holds **preferences only**
  (that's what `App\Core\Settings` is for — one serialized option,
  dot-notation access, and a key must exist in `defaults()` before it can
  ever be persisted).
- Always resolve table names through `fhint_table( 'name' )` — never
  hardcode the `{$wpdb->prefix}fhint_` prefix.
- **dbDelta formatting is load-bearing.** One field per line, two spaces in
  `PRIMARY KEY  (id)`, uppercase `KEY`, every key named, types written
  exactly as MySQL reports them. Get it wrong and dbDelta re-issues the same
  `ALTER` on every request. After any schema change, verify `dbDelta()`
  returns an empty array against an up-to-date database.
- No foreign keys — hosts vary in storage engine.
- Timestamps stored as UTC (`current_time( 'mysql', true )`).
- The docblock above each `Create*Table` class is the authoritative
  documentation of that table's columns and any status lifecycle. Document
  every column there, and say what a value *means*, not just its type.
- **DDL never runs on a front-end request.** `Installer::check_update()`
  guards on `is_admin() || WP_CLI || wp_doing_cron()`. Don't remove that
  guard: a traffic burst against a stale version option would otherwise
  have every concurrent visitor racing dbDelta.

### REST API

**Full endpoint reference: [`includes/API/README.md`](includes/API/README.md)**
— routes, payloads, every error and validation code, and the partial-update
and opening-hours rules. Update it in the same commit as a route change.

`includes/API.php` is the dispatcher; every sub-controller under
`includes/API/` extends `WP_REST_Controller`, exposes a static `init()`, and
registers its own routes on `rest_api_init`. Namespace and version constants
live centrally on `FHINT\API` (`NAMESPACE_NAME` = `fhint`, `VERSION` = `v1`)
— reference those constants rather than hardcoding route strings.

- Every route needs a real `permission_callback`. `__return_true` is a bug.
  Use `FHINT\App\Core\Capabilities::manage()`, which resolves this plugin's
  own `manage_fhint` capability.
- Declare `args` with `sanitize_callback` and `validate_callback`. Don't
  hand-parse `$request->get_params()`.
- `WP_Error` with a machine code and a correct status (400 validation, 403
  capability, 404 missing, 409 conflict).
- Validation errors should return per-field machine codes so the React form
  can attach each message to its own input.

### Capabilities

`manage_fhint` is granted at runtime via the `user_has_cap` filter to anyone
who can `manage_options` — nothing is written to role records, so activation
and uninstall never mutate roles and no orphan capability survives removal.
Filter the required capability with `fhint_manage_capability`.

## PHP rules

- **PHP 7.4 minimum.** No `enum`, no constructor property promotion, no
  `match`, no named arguments.
- **WordPress Coding Standards**, checked by `composer lint`. Tabs,
  `snake_case` methods/functions, `array()` over `[]` in PHP files.
- One class per file. Namespace maps to path: `FHINT\API\Business` →
  `includes/API/Business.php`.
- Every PHP file starts with `defined( 'ABSPATH' ) || exit;`.
- Prefixes: constants `FHINT_`, options `fhint_`, hooks `fhint_`, tables
  `{$wpdb->prefix}fhint_`, text domain `found-hint`, REST namespace
  `fhint/v1`, admin page slug `fhint`.

### Security — non-negotiable

- Every `$wpdb` call with a variable goes through `$wpdb->prepare()`. Table
  names can't be prepared — they come from `fhint_table()`, never input.
- Every admin screen and REST route checks `Capabilities::manage()`.
- Every state-changing request checks a nonce (`X-WP-Nonce` for REST).
- Sanitize on input, escape on output — both, every time.
- Never trust client-side validation; validate server-side on every write
  regardless of what the UI already checked.
- Never log secrets, tokens, or credentials.

## Admin React SPA

### Stack

| Concern | Use |
|---|---|
| React | `react` / `react-dom` (bundled by Vite, not `@wordpress/element`) |
| Routing | `react-router` (`createHashRouter`) — client-side, under one WP page |
| Components | shadcn/ui (`src/admin/components/ui/`) + base-ui primitives |
| State | Redux Toolkit + RTK Query (`src/admin/store/`) |
| HTTP | RTK Query `fetchBaseQuery`, nonce from `window.FHINT` |
| i18n | `@wordpress/i18n` (`__()`) with the `found-hint` text domain |
| Styling | Tailwind CSS v4, classes prefixed `fhint:` (see `components.json`) |
| Build | Vite (`vite.admin.config.js`) via `@kucrut/vite-for-wp` |

One real WordPress admin page (`Admin\Menu`, slug `fhint`) mounts the SPA
into `#fhint-app`; every sub-page is a hash route. Submenu entries point at
`fhint#/route` — **keep `Menu.php`'s submenu list and `routes.jsx` in sync**.

### Rules

- **REST is the only data path.** No `admin-ajax` for new work, no form
  POSTs, no data smuggled through hidden inputs.
- **Bootstrap the first paint.** `Enqueue::bootstrap_data()` →
  `wp_localize_script` → `window.FHINT`, read by
  `src/admin/store/api/baseApi.js`. Never put secrets there — it's page
  source.
- **Assets load on our screen only.** `Enqueue` gates on the exact hook
  suffix `toplevel_page_fhint`. Verify by loading an unrelated admin page
  and grepping the HTML for `fhint-admin`.
- **Field errors come from the server.** REST returns machine codes; the
  client maps them to translated strings.
- **Every string through `__()`** with the `found-hint` text domain.
- **Accessibility is a requirement.** Labels on every control, visible focus
  states, `aria-live` for save/error notices, focus moved to the heading on
  route change, never status by colour alone.
- Add shadcn/ui primitives with the CLI rather than hand-rolling a component
  the library already has:

  ```bash
  npx shadcn@latest add <component>
  ```

  `components.json` is configured (`style: base-vega`, `prefix: fhint`,
  `baseColor: neutral`, Lucide icons, JSX not TSX). Twenty primitives are
  already in `src/admin/components/ui/`.

### Working with generated components

- **Class merging comes from the `cn` package**, not a local helper —
  generated components `import { cn } from "cn"`. There is deliberately no
  `src/admin/lib/utils.js`: keeping a second implementation would put two
  mergers in one bundle and mean hand-editing every component the CLI
  generates.
- **Don't reformat or hand-edit `components/ui/**`.** Regenerating a
  component silently reverts the edit. ESLint exempts that directory from
  `no-unused-vars` for the same reason. If a primitive needs different
  behaviour, wrap it in your own component outside `ui/`.
- **`.npmrc` sets `legacy-peer-deps=true`**, because `eslint-plugin-react`'s
  peer range still tops out at ESLint 9 while this project is on 10. Without
  it the shadcn CLI cannot install anything — it shells out to `npm install`
  and dies on the conflict.
- A clean `npm run build` does **not** prove a new component works: nothing
  imports these yet, so Vite tree-shakes them out entirely. To check them,
  import them somewhere and render — building an SSR entry and running it in
  Node catches both compile and runtime errors without a browser.

## Brand

Product name in the UI: **FoundHint** (the `FHINT` token is the *code*
prefix only — namespace, constants, hooks, slugs — never user-facing copy).
Primary accent `#FF6B35`, dark sidebar — from the FoundHint prototype; see
project memory (`project_ui_prototype_foundhint`) and `docs/NAVIGATION.md`
for the dashboard card composition, Free/Pro gating pattern and copy tone.

## Performance rules

- Audits never run on a front-end request; the front end reads stored
  results.
- Cache schema output and audit results; invalidate on write.
- No external HTTP during page rendering, ever.
- Watch for N+1: load a location's hours in one query, not one per day.

## Free/Pro

There is deliberately **no generic registry or DI layer**. The one
extension point that exists is `App\Core\Limits`, whose `fhint_limits`
filter raises the plan ceilings — every limit check in the plugin goes
through it, so a Pro tier raises a number instead of rewriting core. If
Pro needs more, add narrow filters at the specific points it needs and
document them; don't reintroduce a generic registry.
UI-side gating (`PRO` badges, greyed "PRO ONLY" rows, sample-data cards)
is described in `docs/NAVIGATION.md`.

## Never do

- Put business logic in a dispatcher, a REST controller, or an admin class —
  it belongs in `includes/App/<Domain>/`.
- Store entity data in `wp_options`.
- Run DDL on a front-end request.
- Load the admin bundle on any page other than `toplevel_page_fhint`.
- Hardcode a table name instead of going through `fhint_table()`.
- Commit a `.env`, credentials, or an API key.
