# Architecture

See [CLAUDE.md](../CLAUDE.md) first — this file expands on it rather than
replacing it.

The PHP side is a flat set of top-level modules, each a thin dispatcher with
a static `init()` owning one subdirectory of classes. Business rules live in
`includes/App/<Domain>/`; dispatchers and REST controllers stay thin.

## Boot sequence

```
found-hint.php
 ├─ define_constants()        FHINT_VERSION, FHINT_PATH, FHINT_SETTINGS_NAME, …
 ├─ load_dependency()         vendor/autoload.php + functions.php + hooks.php
 ├─ register activation / deactivation hooks
 └─ on plugins_loaded → on_plugins_loaded()
      ├─ PHP version guard (admin notice, no boot, on failure)
      └─ do_action( 'fhint_loaded' ) → init_plugin()
           ├─ do_action( 'fhint_before_init' )
           ├─ dispatch_hooks()
           │    ├─ App\Core\Capabilities::init()   grants manage_fhint
           │    ├─ Installer::check_update()       version-gated dbDelta (admin/CLI/cron only)
           │    ├─ Database::init()
           │    ├─ API::init()
           │    ├─ Frontend::init()
           │    └─ Admin::init()                    is_admin() only
           └─ do_action( 'fhint_init' )
```

`dispatch_hooks()` is the single source of truth for which modules exist.
Add a module by adding a line there and a dispatcher class next to it.

Activation runs `Installer::init()` directly rather than through a hook: on
activation the plugin file loads *after* `plugins_loaded`, so a listener
attached during boot would never fire.

## Modules

| Module | File | Owns |
|---|---|---|
| Capabilities | `App/Core/Capabilities.php` | granting and checking `manage_fhint` |
| Installer | `Installer.php` | activation, version-gated migrations, self-repair |
| Database | `Database.php` + `Database/` | `dbDelta` table creation, `Tables` registry |
| API | `API.php` + `API/` | REST controllers under `fhint/v1` |
| Frontend | `Frontend.php` + `Frontend/` | JSON-LD output on `wp_head` |
| Admin | `Admin.php` + `Admin/` | menu page, SPA asset loading |
| Google | `Google.php` + `App/Google/` | the Business Profile OAuth connection |
| Audit | `Audit.php` + `App/Audit/` | the rule set, scoring and the daily schedule |

`App/Google/` holds the connection: `Credentials` (the site's own OAuth
client), `Tokens` (storage, never logged and never sent to a browser),
`OAuth` (the handshake, with PKCE and single-use state) and `Connection`
(state, the `admin-post.php` callback, and disconnect). On top of those,
`Client` (authenticated GET with one retry after a refresh), `Profiles`
(reading accounts and locations, and flattening Google's shape into ours),
`GoogleLocationRepository` and `Mapping` (which Google profile is which of
our locations).

`App/Audit/` is the audit engine: `Rule` (the contract), `Context` (the
site gathered once), `Result` (pass, fail or **skip**), `Score` (weighted
and renormalised), `Registry` (the filterable rule set), `Runner`,
`AuditRepository` and `Fixes/FixRunner`. Rules live one per file in
`App/Audit/Rules/`.

`App/Schema/` builds the structured data: `Graph` (the JSON-LD document,
built entirely from `Nap`), `Ownership` (the four publishing modes and SEO
plugin detection) and `SchemaCache` (invalidated by the data stamp rather
than by a purge anyone has to remember).

`App/Core/` holds the cross-cutting pieces: `Settings` (one serialized
option, dot-notation), `Capabilities`, `Limits`, `Logger`, `Validator`,
`ValidationResult`.

## Data model

Eight tables, all prefixed `{$wpdb->prefix}fhint_`, defined one class per
table in `includes/Database/` and named only in `Database\Tables`.

```
business ─┬─ locations ── location_hours
          └─ services

audits ── audit_issues        logs        google_locations
```

- **business** — one row. The single source of truth for name, phone,
  email, website, logo and social profiles.
- **locations** — one row per physical place. Contact columns are empty by
  default, meaning "use the business value".
- **location_hours** — one row per period per day. A lunch break is two
  rows; a day with no rows is *unconfigured*, which is not the same as
  closed.
- **services** — what the business offers. Slug unique per business.
- **audits** / **audit_issues** — one row per run, one row per rule result
  (passes included, so a score recalculates from the rows alone).
- **logs** — event log, trimmed daily to the retention setting.
- **google_locations** — one row per location Google reports, plus the link
  to one of ours. The profile columns are a cache of Google's answer, never
  a second source of truth; the mapping lives here because the relationship
  is owned by the Google side.

No foreign keys: hosts vary in storage engine, so referential integrity
lives in the repositories, and both cascades (deleting a location removes
its hours; deleting a business removes its locations, hours and services)
run inside a transaction.

## Name, address, phone

`App\Nap\Nap` is the **single reader** of name, address, phone, website,
hours and logo. Nothing else may keep its own copy. That is what guarantees
the same phone number appears identically in a block, in JSON-LD and in an
audit finding — the moment a second place caches it, the plugin becomes the
cause of the inconsistency it exists to prevent.

Contact details resolve **location first, business second**, so a location
sharing the company phone stores nothing and cannot drift from it.

## Data flow, write path

```
REST controller (includes/API/*)     args: sanitize_callback + validate_callback
  → Entity::sanitize()                keeps only present writable keys
  → merge over the stored record       an absent key means "leave it alone"
  → Entity::validate()                 → ValidationResult of machine codes
  → Repository                          prepared SQL, transaction, log, stamp
  → envelope: { data, meta }            or WP_Error with per-field codes
```

Validation runs server-side on every write regardless of what the UI
checked. Errors are per-field machine codes (`business.name.required`), so a
form can attach each message to its own input and the copy stays in the
client where it can be translated.

## Limits

`App\Core\Limits` is the only place a plan ceiling is checked — Free allows
one location and five services. Raising one is the `fhint_limits` filter,
not a code change; a hardcoded count anywhere else is what would force a Pro
tier to rewrite core.

## Admin frontend

One real WordPress admin page (slug `fhint`, hook suffix
`toplevel_page_fhint`) renders `<div id="fhint-app">`; `src/admin/main.jsx`
mounts React into it and `createHashRouter` handles every sub-page.

`Admin\Enqueue` loads the Vite build through `libs/assets.php`, serving from
the dev server when `npm run dev` is running and from `assets/build/admin`
otherwise, and localizes `window.FHINT` with `rest_url`, `rest_nonce`,
`plugin_url` and `version`.

## Guarantees

- Admin code and assets are gated on `is_admin()` **and** the exact hook
  suffix — the bundle cannot appear on another admin screen or the front end.
- DDL runs only on activation and on admin/CLI/cron requests, never during a
  front-end render.
- Every REST route has a real `permission_callback`; every argument has a
  `validate_callback`.
- Credentials are redacted centrally before anything reaches the log table.
- No external HTTP during page rendering.
