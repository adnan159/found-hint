# Progress

**The single source of truth for step status.** Update this file whenever a
step finishes: what shipped, and how it was verified — the evidence, not the
intent. Name any bug the verification caught.

Last updated: step 2. The data layer and its REST API exist; the audit
engine, schema output and admin screens do not.

## Step 0 · Scaffold — done

Module skeleton, build pipeline and tooling.

**Shipped:** `found-hint.php` singleton bootstrap
(constants → autoload → `plugins_loaded` → `fhint_loaded` →
`dispatch_hooks()`); module dispatchers; `App/Core/Capabilities`;
`Admin/Menu` + `Admin/Enqueue`; the Vite + React + Redux Toolkit + RTK Query
+ shadcn/ui admin shell; Composer PSR-4 + PHPCS; ESLint/Prettier;
`scripts/build.cjs` + `zip.cjs`; `libs/assets.php`.

**Verified:** PHPCS clean; Vite build clean and the *compiled bundle*
grepped for `window.FHINT` / `fhint-app` / `fhint:` classes rather than
trusting the source. A stubbed-WordPress boot run twice proved all modules
dispatch as admin (menu registers 9 pages, all requiring `manage_fhint`)
and that a front-end request registers **zero** admin hooks. Asset gating
was proved by behaviour: `edit.php` and `index.php` load nothing,
`toplevel_page_fhint` resolves the real manifest and enqueues
`fhint-admin`.

**Bug caught:** the installer ran `dbDelta` and wrote options on front-end
page loads. `check_update()` now guards on
`is_admin() || WP_CLI || wp_doing_cron()`, inside the installer so no call
site can bypass it.

## Step 1 · Prefix rename — done

Every code-level prefix became `FHINT`/`fhint`: namespace, constants, hooks,
options, capability (`manage_fhint`), table prefix (`fhint_`), REST
namespace (`fhint/v1`), menu slug, script handle, `window.FHINT`, and the
Tailwind class prefix (`fhint:`). The product name "FoundHint" and the
`found-hint` text domain/slug were deliberately left alone.

**Verified:** autoload smoke test resolved every class and asserted the
constants; the compiled bundle was grepped for the new tokens; PHPCS and the
Vite build stayed clean.

**Bug caught:** `composer.json`'s PSR-4 map still pointed at the old
namespace, so nothing autoloaded until it was updated and the autoloader
regenerated — caught because the smoke test loaded classes rather than
assuming a rename had worked.

## Step 2 · Data layer and REST API — done

The seven tables, the domain rules, and the REST surface for business,
locations, opening hours, services and settings.

**Shipped:**
- `Database/Tables.php` — the one place a table name is spelled out, plus
  `exists()` / `missing()` for self-repair.
- Seven `Database/Create*Table.php` classes, each documenting every column
  in its docblock: business, locations, location_hours, services, audits,
  audit_issues, logs.
- `App/Core/` — `Validator` (email, URL, phone, country, currency,
  timezone, date, time normalisation, coordinate ranges), `ValidationResult`
  (per-field machine codes), `Limits` (Free: 1 location, 5 services, raised
  by the `fhint_limits` filter), `Logger` (event log with central credential
  redaction, retention purge), `Settings` (one serialized option).
- `App/Business/`, `App/Location/`, `App/Service/` — entity rules
  (sanitise/validate/format) and repositories with prepared SQL,
  transactional cascades and slug uniqueness.
- `App/Location/OpeningHours.php` — the week model: parses both documented
  payload shapes, validates overlaps and zero-length periods, and shapes
  the response grouped by day in display order.
- `App/Nap/Nap.php` — the single reader of name/address/phone/hours,
  resolving location first, business second.
- `API/` — `AbstractController` (envelope, permission check, validation
  error shape, `args()` that injects a `validate_callback`), plus
  `Business`, `Locations`, `Services` and `Settings` controllers.
- `uninstall.php` — drops tables and options **only** on explicit opt-in.
- Daily `fhint_purge_logs` cron, reconciled on `init`, cleared on
  deactivate.

**Verified** — three smoke suites, 566 assertions, 0 failures:
- `tests/Smoke/domain-logic.php` (84) — validation, sanitisation, hours
  parsing, limits, redaction, with WordPress absent.
- `tests/Smoke/schema-format.php` (248) — every dbDelta formatting rule on
  every table: two spaces in `PRIMARY KEY`, named keys, one definition per
  line, no foreign keys, no `CURRENT_TIMESTAMP` defaults. Also asserts no
  table name is hardcoded outside `Database/`.
- `tests/Smoke/rest-routes.php` (234) — every route registers under
  `fhint/v1`, every endpoint has a real permission callback (and never
  `__return_true`), every argument has a `validate_callback`.

**The suites were mutation-tested rather than trusted.** Four deliberate
defects were introduced one at a time and each was caught: a single-space
`PRIMARY KEY (id)`; `Limits` ignoring its filter; an unconfigured day
reporting as configured; and a route swapped to `__return_true`. Restoring
each returned the suites to green.

**Bug caught:** `dispatch_hooks()` still called the deleted `Ajax` module
after the admin-ajax scaffolding was removed — a fatal on every request,
found by re-running the boot simulation rather than assuming the deletion
was clean.

**Not verified — the significant gap.** No code here has touched a real
database. Local's MySQL was not running, so:

1. `dbDelta` has never actually created these tables.
2. **Idempotency is unproven.** The formatting rules are checked
   statically, but only running `dbDelta()` twice against real MySQL proves
   it returns an empty array the second time.
3. No repository has been exercised: no insert, update, cascade delete,
   transaction rollback or slug-collision path has run.
4. No REST route has been called over HTTP; the 401/403 behaviour is
   asserted from registration, not from a logged-out request.

Do that first, before building anything on top: start Local, activate the
plugin, confirm the seven tables appear, run `dbDelta` a second time and
assert it reports no changes, then drive the routes with real payloads.

## Pending

1. **Database round-trip verification** (above) — the gate on everything else.
2. **Schema engine** — JSON-LD graph from `Nap`, output on `wp_head`,
   SEO-plugin detection and the four ownership modes, cached and
   invalidated on write. Needs `Frontend/`.
3. **Audit engine** — rule contract, runner, scoring, the Free rule set,
   and the safe automatic fixes. Tables already exist.
4. **Dashboard API** — reads stored audit figures, never measures.
5. **Admin screens** — replace the placeholder pages in `src/admin/pages/`,
   one RTK Query slice per resource.
