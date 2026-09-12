# Progress

**The single source of truth for step status.** Update this file whenever a
step finishes: what shipped, and how it was verified — the evidence, not the
intent. Name any bug the verification caught.

Last updated: step 3. The data layer, its REST API and the admin screens
for everything it covers exist. The audit engine and schema output do not.

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

## Step 3 · Admin screens — done

The screens for every feature the API actually backs, built from the
prototype's design language with shadcn/ui on Tailwind v4.

**Shipped:**
- RTK Query slices, one per resource (`store/api/{business,locations,services,settings}Api.js`),
  unwrapping the `{ data, meta }` envelope.
- `lib/errors.js` — all 38 domain codes mapped to sentences, plus handling
  for both documented error shapes (`data.fields` machine codes and
  WordPress's `data.params`).
- Screens: Dashboard, Business, Locations (list + detail), Services,
  Settings. Shared pieces: `PageHeader` (moves focus to the heading on
  route change), `SectionCard`, `NoticeBar`, `RequestError`.
- `OpeningHoursEditor` — the full week, preserving the three-state model
  (not set / closed / open) and split shifts, and omitting unset days from
  the payload so "never said" is never published as "closed".
- Design tokens retuned from the prototype's own stylesheet: square corners
  (`--radius: 0`), warm neutrals, Archivo, `#ff6b35`. Applied through the
  theme so shadcn primitives inherit them rather than being overridden
  per call site.
- `Admin\Enqueue` now localizes a `reference` block (business types,
  statuses, timezones) so selects read their options from the server
  instead of duplicating a filterable PHP list in JavaScript.

**Deliberately not built,** because the feature behind them does not exist:
the health score, Google Business Profile, ranking grid, performance and
"fix first" cards from the prototype, and the Schema and SEO Audit screens.
A card showing an invented number is worse than an absent one — it is
indistinguishable from a real reading. `schema_mode` is likewise stored by
the API but has no control, because nothing reads it yet.

**Removed:** the `Schema`, `SEO Audit` and `Google Business Profile` pages,
routes and menu entries; five unused shadcn components (checkbox,
dropdown-menu, radio-group, tabs, tooltip).

**Verified in a browser, not just built.** The production bundle was loaded
in a harness with the REST API mocked, and every screen driven: business
and location forms populated from the API, the services table with its
ordering controls correctly disabled at both ends, the add-service dialog,
settings with live system figures, and the hours editor round-tripping a
week containing a split shift, an explicitly closed day and two unset days.
An SSR pass also renders all eight routes, so a runtime error cannot hide
behind a passing build (Vite tree-shakes anything unimported).

**Bug caught:** the business type select showed its placeholder instead of
the saved value. The cause was `value={x || undefined}` — `undefined` makes
Base UI's select uncontrolled on first render, so the real value arriving
with the profile was ignored. Isolated by comparing against the location
and hours selects, which always pass a string and worked; fixed by passing
`null`. Only visible by looking at the running UI: it builds, lints and
renders without complaint.

## Step 4 · Guided setup — done

A six-step wizard at `#/setup`: welcome, business, address, hours, services,
finish.

**The wizard stores a position and nothing else.** Every value it collects
goes through the ordinary resource endpoints — the business step calls
`PUT /business`, exactly as the Business screen does. `/onboarding` has no
write path for content, because a second one would mean a second set of
validation rules to keep in step, and it is what would let "start over"
destroy real work.

**Shipped:**
- `App\Onboarding\Onboarding` — the position store. One option
  (`fhint_onboarding`) holding `status, current, completed, skipped,
  started_at, ended_at`, and six actions: `go`, `complete`, `skip`,
  `finish`, `dismiss`, `restart`.
- `API\Onboarding` — `GET|POST|PUT|PATCH /onboarding`, both methods
  returning the same state object so no client needs a follow-up read.
  `action` and `step` are validated against their enums.
- Per-step status is computed from the **live repositories** on every read,
  not from a stored flag, so a value entered on the ordinary Business or
  Locations screen counts the step as done without the wizard being opened.
  A step is done when the data exists **or** the user walked it — walking
  `hours` without setting a day is a legitimate answer, because unset is not
  closed.
- `pages/setup/` — `WizardShell` (sticky header, step strip, focus moved to
  the *step* heading on every change: the page has not changed, the step
  has), and one component per step.
- `store/api/onboardingApi.js`, routed at `#/setup` and listed in the
  sidebar and the WordPress submenu.

**Verified:** `tests/Smoke/onboarding.php` — 42 assertions, and
**mutation-tested** rather than assumed: adding a business name to the
position produced 2 failures, and making `restart` delete settings produced
1. It asserts the stored keys are exactly those six, that no `name`,
`address`, `phone`, `email`, `website` or `city` field appears, and that a
restart leaves every other stored option byte-for-byte identical.

The whole flow was then **driven in a browser** against a stateful mock,
welcome through finish, and the request log checked rather than the screen
alone: eleven writes, of which `/onboarding` carried six position moves and
every value went to `PUT /business`, `POST /locations`, `PUT /locations/12`
and `POST /services` — the architectural rule holds in the running app, not
just in the source.

**Bug caught — in the test harness, not the plugin.** Every mutation looked
like it was being swallowed. The cause was the mock: RTK Query's
`fetchBaseQuery` calls `fetch(request)` with a `Request` object, so the
method and body live on *it*, while the mock read `opt.method` and
`opt.body` from an always-empty second argument. Every mutation therefore
arrived as a `GET`. Worth recording because the symptom pointed squarely at
the application and cost a long detour through store and fiber inspection
before the harness was suspected.

## Step 5 · Sidebar — done

Rebuilt against the prototype's own rendered styles rather than a
screenshot: a white 236px panel closed by a 2px `rgb(32 30 29 / 40%)` rule,
a 30px mark over `FOUNDHINT / LOCAL SEO`, rows uppercase 12.5px/800 on
`#eae7e7` hairlines, and an active row set larger (13.5px) in `#fff1eb` on
`#8a3b12` behind a 3px `#ff6b35` bar — indented 6px further than an
inactive row, which is what makes the bar read as pushing the label aside
rather than sitting on it. The footer carries the permanent plan strip.
Two tokens were added for values the design system did not yet name:
`--sidebar-sub-foreground` (#444141) and `--sidebar-chevron` (#9b9797).
Verified by reading computed styles back out of the running bundle and
diffing them against the prototype's: zero differences.

**The prototype's expandable groups are reproduced only where the children
are real destinations.** There, most sub-links do not navigate. Here a
group survives for Business and Settings, whose children jump to actual
sections of those screens — `SectionCard` now takes an `id`, and the seven
sections carry one. Dashboard, Setup, Locations and Services stay plain
rows because each is a single destination. Schema, Landing Pages, SEO
Audit, Google Business Profile, Ranking Grid, Performance and
Recommendations remain absent: no engine, and a row opening an empty screen
reads as broken rather than unbuilt. The prototype's "See what Pro unlocks"
button is likewise left out until there is something for it to open.

A group opens by itself when its screen is the current one and closes when
you leave, so the sections of the page you are on are always listed.
Jumping to a section moves focus to its heading, not just the scroll
position — otherwise only sighted users actually arrive.

**Two races, both found by testing rather than by reading.** A jump from
another screen first did nothing at all: the lookup ran before the
destination had mounted and loaded. Waiting on frames fixed that case but
was the wrong instrument — `requestAnimationFrame` is throttled to a stop
in a background tab, which is also why the first test of the fix appeared
to hang. A `MutationObserver` waits on the DOM change itself. Then the
opposite case surfaced: when the destination's data was already cached the
section existed immediately, the reveal ran inline, and the screen's own
`PageHeader` — whose mount effect runs *after* the sidebar's, since the
sidebar is higher in the tree — took the focus straight back. Revealing
from a task instead of inline settles both, because a task runs after every
effect in the commit.

Verified across four cases in a browser with a deliberately slowed mock:
cross-screen into a still-loading screen, same-screen, and cross-screen
twice more with the data already cached. All four land on the requested
section with focus on its heading.

## Pending

1. **Database round-trip verification** (above) — the gate on everything
   else. The screens have only ever talked to a mocked API.
2. **Schema engine** — JSON-LD graph from `Nap`, output on `wp_head`,
   SEO-plugin detection and the four ownership modes, cached and
   invalidated on write. Needs `Frontend/`.
3. **Audit engine** — rule contract, runner, scoring, the Free rule set,
   and the safe automatic fixes. Tables already exist.
4. **Dashboard API** — reads stored audit figures, never measures.
5. **Screens for the rest** — the audit, schema and dashboard score cards,
   once their engines exist.
