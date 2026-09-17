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

## Step 6 · Google Business Profile connection — done

OAuth 2.0 against Google, a Connection screen, and a disconnect that
actually revokes.

**The site uses its own Google Cloud OAuth client.** The operator creates a
project, enables the Business Profile APIs and pastes the client id and
secret in. That is more setup than a hosted broker would be, and it was the
only honest option: a broker means every site's tokens passing through a
server this plugin does not have, and a client secret shipped inside a
plugin download is not a secret. `App\Google\OAuth` is the seam, so a
broker can be added later without the rest of the module knowing.

**Shipped:**
- `App\Google\Credentials` — the client id and secret, in their **own**
  option rather than `Settings`, because `GET /settings` returns that whole
  option to the browser. An empty value on save means "keep the stored
  one", so the id can be corrected without re-entering a secret that is
  never sent back.
- `App\Google\Tokens` — token storage. Never logged, never sent to a
  browser.
- `App\Google\OAuth` — the handshake. Single-use `state` bound to the
  user who started it, PKCE (S256), `access_type=offline` and
  `prompt=consent`, and Google's own error strings turned into sentences an
  operator can act on.
- `App\Google\Connection` — coarse status (`not_configured`,
  `disconnected`, `connected`, `needs_reconnect`), the `admin-post.php`
  callback, transparent refresh, and disconnect.
- `API\Google` — `GET|DELETE /google`, `POST /google/credentials`,
  `POST /google/connect`. No route returns a token or a secret.
- `pages/google/` — the Connection screen, keeping the prototype's trust
  line verbatim: *"You sign in on Google's own page. FoundHint never sees
  your password, and nothing on your profile changes without your
  confirmation."* The redirect URI is shown for copying, because a mismatch
  is the usual reason a first connection fails and it fails on Google's
  side, where this plugin never gets to explain it.

**Security decisions worth keeping:**
- `state` defends the callback. Without it, anyone can send an
  administrator a link that connects the site to *their* Google account,
  and the site then publishes to a profile its owner does not control.
- PKCE defends the code against leaking through a referrer or proxy log.
  Google does not require it for a confidential client; it costs nothing
  and closes a failure that is invisible when it happens.
- **Google credentials are deleted on uninstall regardless of the
  "keep everything" opt-in.** That rule protects the operator's *work*; a
  refresh token is not work, it is a live grant to their Google account,
  and leaving one in the database of a site that no longer runs the plugin
  is a liability with nothing on the other side of the scale.

**Verified:** `tests/Smoke/google.php` — 73 assertions, Google never
called; answers come from a queue in the harness, which is the point, since
what needs proving is what this plugin does with an answer. Covered: the
challenge really is the S256 hash of the stored verifier, state is single
use and user-bound, a refresh response that omits a refresh token keeps the
stored one, `invalid_grant` clears the connection while a 500 or an
unreachable host **keeps** it, a 200 with no access token is a failure, and
partial consent reports `needs_reconnect`.

**Mutation-tested**, five defects introduced and all five caught: blanking
the refresh token on refresh (2 failures), not consuming the state (2),
dropping `prompt=consent` (1), clearing the connection on any refresh
failure (3), and leaking the client secret into the state sent to the
browser (3).

**Bug caught in the browser, not the tests.** The failure notice is
read-once on the server, but RTK Query served the cached copy on every
return to the screen, replaying a failure the operator had already dealt
with. Neither `isFetching` nor a cache patch fixed it — on a remount the
cached render is not loading, not fetching and not stale as far as the hook
is concerned. The rule that works is temporal: trust the notice only from a
read that *finished after the screen opened*.

**Not built:** listing business profiles and mapping them to locations —
the prototype's next two GBP screens. The Business Profile APIs also need
Google to approve the project before they return anything, which is why the
connection reads the account email through `userinfo.email`: a correctly
connected site would otherwise have nothing to show for it and read as
broken.

**Unverified:** no live handshake has run. There is no Google Cloud client
here to run one with, so the request shapes, the redirect URI and the
callback are as-specified rather than as-observed. First connection on a
real site is the test that matters.

## Step 7 · Business profiles and location mapping — done

Reading the places the connected Google account manages, and saying which
of them is which of ours.

**An eighth table, `google_locations`**, holding one row per location
Google reports plus the link to one of ours. The mapping lives on the
Google side because that is where the relationship is owned: a Google
location maps to at most one of ours, many are visible and never mapped,
and putting it here leaves the shape of `locations` — whose formatting is
asserted by a test — untouched. The profile columns are a **cache of
Google's answer**, not a second source of truth; nothing reads business
data from them. `FHINT_DB_VERSION` bumped to 0.2.0, without which the new
table never appears on an existing install.

**Shipped:**
- `App\Google\Client` — authenticated GET. A 401 is retried **exactly
  once** after forcing a refresh: Google can reject a token this site still
  believes in, and retrying more would loop against someone else's rate
  limit. A 403 is reported as "Google has to approve your Cloud project",
  because a correctly connected site gets nothing back until it does and
  would otherwise read as broken.
- `App\Google\Profiles` — walks both APIs (Account Management for
  accounts, Business Information for locations), paginates with a hard page
  cap, and flattens Google's shape into ours. The raw object is kept
  alongside: Google's shape changes faster than a schema should.
- `App\Google\GoogleLocationRepository` — upsert, map, unmap, truncate.
  **A sync never touches a mapping**; re-reading Google must not silently
  undo the operator's decision.
- `App\Google\Mapping` — the overview, and suggestions. Scoring is
  deliberately crude: a cleverer score invites trusting it, and the cost of
  a confident wrong answer is publishing one branch's details to another.
  Nothing is ever mapped automatically.
- Routes: `GET|POST /google/profiles`, `POST|DELETE /google/mapping`. The
  sync is a POST because it makes external requests and writes rows.
- Screens: Business profiles (a table with a "Read from Google" action and
  a "last read" stamp) and Location mapping (a chooser per location, with
  close matches marked).

**Two lifecycle rules worth keeping:** disconnecting clears the stored
profiles and their mappings, because they describe an account nobody is
signed in to any more; and deleting one of our locations releases its
mapping through a new `fhint_location_deleted` action, so a Google profile
is never left looking claimed by a row that no longer exists. The hook is
how `LocationRepository` avoids having to know the Google module exists.

**Verified:** `tests/Smoke/google-profiles.php` — 51 assertions covering
the 401-retry-once rule, the 403 and 429 messages, pagination across pages
and its hard stop, `readMask` being sent (the Business Information API
rejects a request without it), the flattening of addresses and metadata,
and the suggestion rules. **Mutation-tested**, six defects introduced and
all six caught: an uncapped 401 retry, a dropped `readMask`, ignoring
`nextPageToken`, suggesting already-mapped locations, dropping address
lines, and an uncapped suggestion list.

The whole flow was then driven in a browser against a stateful mock: empty
state, sync, link, the linked profile disappearing from the other
location's choices, **a re-sync preserving the mapping**, and unlink
putting the profile back in play.

**Two bugs caught by looking at it.** "Read 3 locations across 1 accounts"
— one format string cannot pluralise two numbers, so each half is counted
separately now. And `SectionCard` dropped its header action into the header
with no slot, stretching the button across the full width; the card already
had a `CardAction` slot that makes the header a two-column grid.

**Not covered: the repository SQL.** `GoogleLocationRepository` has never
run against MySQL, like every other repository here. The upsert-preserves-
mapping rule and the one-to-one release are expressed in SQL that no test
has executed — they are the first things to check once a database exists.

## Step 8 · Schema engine — done

The JSON-LD that tells search engines what the business is, where it is and
when it is open — built from `Nap`, cached, and published on `wp_head`.

**Shipped:**
- `App\Schema\Graph` — the document. A typed LocalBusiness node with a
  stable `@id`, PostalAddress, GeoCoordinates, opening hours and an
  OfferCatalog of active services. **Every value comes from `Nap`**;
  nothing here reads a repository for a name or holds its own copy, which
  is what keeps the markup identical to what the screens show.
  `from_parts()` takes the values as arguments, so the whole class runs
  without a database and the audit will be able to ask what a hypothetical
  change *would* publish.
- `App\Schema\Ownership` — the four modes and SEO plugin detection.
- `App\Schema\SchemaCache` — **invalidated by stamp, not by purge.** The
  entry carries the `fhint_data_changed_at` it was built from and a
  mismatch rebuilds. Every write already moves that stamp, so there is no
  list of places that must remember to clear a cache — the one that forgets
  is the one that serves a stale phone number for a week. Settings do not
  move the stamp, so `Settings::save()` now fires `fhint_settings_saved`
  and the cache listens.
- `Frontend\Schema` — the only part of the plugin on every public request,
  so it does as little as possible: read a cached array, encode, print.
- `GET /schema` and a Schema screen: the mode control (`schema_mode` was
  stored but had no UI until now), what is blocking publication, what would
  improve it, and the exact markup.

**The rule that matters most.** A day nobody configured is **omitted**;
publishing `00:00–00:00` for it would tell Google the business is shut then,
and that is a claim this plugin has no basis to make. A day explicitly
marked closed *is* published that way — there the operator did say so. A
temporarily closed location publishes no hours at all, and a permanently
closed one publishes nothing.

**Detection is three-valued, and `auto` defers only to certainty.** An SEO
plugin being active does not mean it publishes LocalBusiness: Yoast only
does with its Local SEO add-on, Rank Math only when configured as one. So
`emits_local_business` is `true`, `false` or `null`, and `auto` stands
aside only for `true`. Deferring to anything uncertain would leave many
sites silently publishing nothing — the worse failure, because it is
invisible. A `null` is surfaced to the operator instead.

**Verified:** `tests/Smoke/schema-graph.php` — 109 assertions, no database.
**Mutation-tested**, and one of the mutations was not caught at first:
removing the ownership guard from the output path changed nothing, because
the harness has no publishable record and the *data* guard was stopping
output either way. A guard nothing distinguishes is one that can be deleted
without any test noticing, so the context check was split into
`Schema::context_allows()` and covered on its own. The other nine — closed
days for unset days, publishing empty values, permanently closed,
temporarily closed hours, deferring to any SEO plugin, collapsing split
shifts, dropping `JSON_HEX_TAG`, printing an empty tag, ignoring the cache
stamp — were all caught.

**Escaping is tested, not assumed.** A stored name containing
`</script><img …>` would end the element early and turn structured data into
markup. `JSON_HEX_TAG` prevents it, and the test asserts the output contains
exactly one closing tag and that the value still decodes back intact —
escaped, not discarded.

**Bug caught in the browser:** the mode select showed `auto` rather than
"Automatic". Base UI's `SelectValue` renders the raw value unless given a
function, and every other select in this plugin happens to use values that
read as labels, so this was the first place it could show.

**Verified on a real page.** The front end of the Docker site publishes one
`application/ld+json` block built from its own database — `@type: Store`,
the address, geo and the week's hours. `wp_head` firing, the cache and the
graph from real repositories are all confirmed; see Step 9.

## Step 9 · Database verification — done

**The gate is closed.** Every claim in this file that was qualified with
"never run against a real database" has now been run against one:
`foundhunt_app` in Docker, real MySQL, real WordPress.

`tests/Integration/database.php` — **86 assertions, 0 failures**, and
re-runnable:

```bash
docker exec foundhunt_app php \
  /var/www/html/wp-content/plugins/found-hint/tests/Integration/database.php
```

**It does not touch the site's own data.** Every table name resolves through
`Tables::name()`, which reads `$wpdb->prefix` at call time, so the suite
swaps the prefix and gets its own eight tables against the same MySQL. They
are dropped at the end and the few `fhint_*` options the repositories stamp
are snapshotted and restored — verified afterwards: no leftover tables, the
site's business, location, services and hours untouched, and the front page
still publishing its JSON-LD.

**What it proves:**
- **dbDelta idempotency** — the check that cannot be done without a
  database and has the most expensive failure, since a definition dbDelta
  disagrees with re-issues the same `ALTER` on every request, invisibly,
  forever. Second and third runs both return an empty change set, and a
  failure prints exactly what dbDelta wanted to change.
- All eight tables install, and `Tables::missing()` is empty afterwards.
- Round trips: business (including a JSON column decoding back into an
  array, and `Ólafur's Café — 北京 ☕` surviving intact), locations
  (decimal precision on coordinates, booleans, timestamps), services with
  ordering, and the three-state opening hours — a split shift stored as two
  rows, an explicitly closed day stored closed, and **a day nobody
  configured having no rows at all**.
- Cascades: deleting a location removes its hours and releases its Google
  mapping through `fhint_location_deleted`; deleting the business removes
  its services.
- The Google mapping SQL, none of which had ever executed: mapping writes
  the link, **a re-sync updates the profile but leaves the mapping alone**,
  and mapping elsewhere releases the previous claim.
- `Nap`, `Graph` and `SchemaCache` built from real rows, including the
  cache rebuilding when the data stamp moves.
- REST over the real stack: read, create (201), a 400 on invalid input, and
  plan limits enforced where they actually live — a second location and a
  sixth service both refused with the documented codes and no row written.
- Capability denial: 401 logged out, **403 for a subscriber** — a different
  answer, as documented.

**Mutation-tested.** Changing `sort_order int(11)` to `integer` was caught
immediately, with dbDelta's own explanation printed. Writing
`PRIMARY KEY (id)` with one space was *not* caught here — and that is
correct: it causes no repeated `ALTER`. That rule belongs to the static
`schema-format` suite, which does catch it. The two checks are
complementary, and knowing which owns which rule is the point.

**A real bug this found.** `ServiceRepository::create()` derived no slug —
the name-to-slug rule lived only in the REST controller. Since the slug is
half of a unique key, any other caller (the setup wizard, an importer,
WP-CLI) would store an empty slug, and the *second* such service would
collide with the first and fail the insert, returning null. Moved into the
repository so every caller gets it. The failure was invisible in every
offline suite because nothing there had a unique index.

`Database::create_tables()` and each `Create*Table::up()` now **return**
dbDelta's change set, which is what made the idempotency check possible at
all.

## Step 10 · Audit engine — done

Twenty-two rules, weighted scoring, stored runs, a daily schedule, and
three automatic fixes. Run on the live site it scores **86 (good)**: 19
rules ran, 15 passed, 4 findings, 3 correctly skipped because Google is not
connected.

**Shipped:**
- `App\Audit\Rule` — the contract. **A rule is a pure function of the
  `Context` it is handed** and reads nothing for itself, which keeps a run
  to a fixed number of queries however many rules exist, makes the whole
  set testable without a database, and stops a rule from becoming a second
  source of truth for a phone number.
- `App\Audit\Context` — the site gathered once. Thirty rules each fetching
  the business and its hours is thirty times the queries and thirty chances
  to judge slightly different states of the same data mid-run.
- `App\Audit\Result` — **three outcomes, not two.** `skip()` means the
  rule had nothing to judge, and is removed from the denominator entirely.
- `App\Audit\Score` — weighted per category, **renormalised over the
  categories that actually ran**, with a breakdown whose `earned` values
  sum to the total.
- `App\Audit\Registry` — Free lists its rules, Pro appends to
  `fhint_audit_rules`. A missing class, a non-rule and a duplicate id are
  each dropped rather than allowed to break a run.
- `App\Audit\Runner`, `AuditRepository`, `API\Audits`, and a daily
  schedule in `Audit`.
- The SEO audit screen: score, category breakdown, findings with Fix and
  Ignore, and the passes listed so the denominator is visible.

**The decisions worth keeping:**
- **A skip is neither a pass nor a failure.** Counting it as a pass inflates
  a score nobody earned; counting it as a failure penalises a site for a
  feature it never opted into. Schema publishing switched off deliberately
  *skips*, and its category weight is redistributed.
- **A score is explainable.** The category earned values sum to the total,
  so 86 decomposes into where the missing 14 went. A number an operator
  cannot take apart is one they cannot act on.
- **Severity and weight are separate.** A missing logo is low severity but
  still costs a point; urgency is not the same as how much a score should
  move.
- **"Safe" fix is a hard line.** A fix qualifies only when the correct value
  is already known — the same address with `https://`, or the one location
  that exists becoming primary. With several locations and none primary the
  handler *refuses*, because choosing would be this plugin deciding which
  branch represents the business. There is deliberately no
  `business.set_phone`.
- Passes store no severity, so "3 critical" stays meaningful. Runs are
  written `running` first, so **a run that dies leaves a `failed` row**
  rather than looking like one nobody started.

**Verified:** `tests/Smoke/audit.php` — 162 assertions, no database, every
rule exercised through a context built from arrays. **Mutation-tested**,
six defects, all six caught: skips counted as passes, weights not
renormalised, duplicate rule ids admitted, a deliberately-disabled category
scored as failure, exact-match name comparison, and a pass storing a
severity. The storage, the counts matching the rows, staleness and
retention are covered by `tests/Integration/database.php` against real
MySQL.

**A bug the screen found.** The findings card says "most urgent first" and
the list was in rule-registration order. Sorting now happens in the
repository rather than the screen — a list that claims to be urgent-first
has to be urgent-first for the dashboard and for anything Pro adds too —
and the integration suite asserts it, with the assertion mutation-checked.

**Not built:** the dashboard score card, which is next and now has stored
figures to read.

## Step 11 · Dashboard score card — done

The Local SEO health score on the dashboard, beside setup progress as in
the prototype's top row.

**Built to the prototype's measured values** — a white card on a #d7d3d3
hairline with 22px padding, a 68px/800 score, a 13px/800 uppercase title,
a 12.5px/700 green delta, and a four-segment band bar filling up to the
band reached, in #c02718, #b26a00 and #157f4b over #eae7e7. Computed styles
were read back out of the running bundle and diffed against the prototype:
zero differences.

**Shipped:**
- `API\Dashboard` — `GET /dashboard`, read-only by construction. The
  integration suite counts audit rows before and after reading it, and
  asserts that `POST` has no route.
- `App\Audit\Trend` — pure, so every rule about what the card may claim
  is tested without a database.
- `AuditRepository::completed_runs()` and `open_counts()`.
- `ScoreCard` — score, band, trend, "Checked 12 minutes ago" in the site's
  language, a stale warning with a *Check again* button, and an empty state
  with *Run your first check*.

**Two things the prototype does not do, and this card must:**
- **It never claims more history than exists.** The prototype always reads
  "in the last 30 days". Here the comparison is with the newest run at
  least 30 days old; where none exists the card says "since" the date it
  actually compared against. One run shows "Your first check — no trend
  yet", never "+0".
- **An out-of-date score is shown with a warning**, never hidden and never
  re-measured behind the operator's back. The dashboard query refetches on
  every visit, because staleness depends on edits made on other screens.

Direction is carried in the words as well as the colour: a real minus sign,
"−12", not a red "12".

**Verified:** `tests/Smoke/dashboard.php` — 19 assertions, mutation-tested
with four defects, all caught (a single run reporting +0, always claiming
the full window, baseline taken as the oldest run instead of the newest a
window old, and trusting input order). `tests/Integration/database.php` —
now 117, covering the route against MySQL: the trend spanning a real
40-day-old run, ignored findings leaving the open count, per-severity
counts summing, logged-out denial, and no write method. Seven card states
were driven in a browser — rising, falling, flat, short history, first run,
stale, and no audit — including *Check again* actually running an audit and
refreshing the card, and the live site's real refusal (409, no business)
being shown.

**Caught while verifying:** the refusal's heading read "That did not save",
the error component's default — wrong, since nothing was being saved. It now
reads "The check did not run". A first attempt at testing that path also
appeared to show no error at all; the browser was running a cached copy of
the test page, so that result was discarded rather than acted on.

**Site note:** during this step the Docker site was reset with WP Reset
(`reset_count: 1`; WordPress's own tables recreated at 18:03:19, FoundHint's
at 18:03:30). Its business, locations, services and audit history are gone,
and WP Reset holds no snapshot. Nothing in this plugin or its test suites
can drop WordPress core tables — the integration suite only ever drops its
own `fhitest_` tables.

## Pending

Everything in the Free plan's first cut is built. What remains is the
prototype's work that has no engine yet:

1. **Landing pages**, **ranking grid**, **performance** and
   **recommendations** — each needs its engine before any screen.
2. **Google reviews, posts and data comparison** — built on the connection
   and mapping, and mostly Pro.
