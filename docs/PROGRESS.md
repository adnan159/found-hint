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

## Step 12 · Google Places lookup — done

Finding the business on Google Maps **without signing in to Google**, and
comparing what Google shows with what this site holds. Asked for as an
*import*; built as a comparison, because the terms were read first.

**Why it does not import.** The Google Maps Platform Terms of Service give,
as an example of prohibited scraping, §3.2.3(a)(iii): *"copy and save
business names, addresses, or user reviews"*; §3.2.3(b) forbids caching
anything the Service Specific Terms do not expressly allow. For the Places
API those allowances are two: the place id, indefinitely (General Service
Terms §3), and latitude/longitude for at most 30 days (§14.3). There is no
exception for a business's own listing. Importing through Places would put
every site using it in breach, with key suspension as the realistic cost.
The import that *is* permitted is the Business Profile API through OAuth
(steps 6–7), which reads the owner's own listing under different terms.

- **A ninth table, `place_links`**: place id, coordinates, their cache time.
  No column for a name, address, phone or hours — the table's shape *is*
  the compliance guarantee, and `tests/Integration/database.php` asserts
  the exact column list. `FHINT_DB_VERSION` is `0.3.0`.
- `App\Places\Retention` deletes coordinates 30 days after they were read,
  from a daily event **and** on every read of the state, because WP-Cron
  only runs when someone visits and the permission does not pause.
- `App\Places\Client` sends the key as `X-Goog-Api-Key`, never in a URL,
  with field masks that ask for no reviews and no photos. Google's 403s are
  split into billing, key restriction and API-not-enabled messages.
- `App\Places\Comparison` — phones compared as digits with the trunk zero
  and country code reconciled; websites ignoring scheme, `www.` and a
  trailing slash; addresses by street, town and postcode, leaving out
  country and region; hours day by day, keeping the three states.
- `API\Places` — `GET /places` (calls nobody), `POST|DELETE /places/key`,
  `POST /places/search`, `POST|DELETE /places/link`, `POST /places/live`.
  Every route that calls Google is a POST.
- The Google screen gains **Find your business on Google** as its first
  section, and the sidebar a *Find on Google* entry. Every Google value on
  screen sits above Google's required text attribution, "Google Maps",
  styled to their spec (12px, weight 400, `#5E5E5E`, untranslated, never
  wrapped). There is no button that copies Google's values into the
  business record, by design.

**Verified:** `tests/Smoke/places.php` — 88 assertions, mutation-tested
with sixteen defects, all caught (retention at 31 days, the cutoff's sign,
reviews in the field mask, the key in the query string, no trunk-zero
reconciliation, unknown days invented as closed, unconfigured days reported
as different, id-less candidates offered, an empty save wiping the key,
the hint showing the key's tail, `www.` significant, and four in the
address comparison). `tests/Integration/database.php` — now 163, covering
the table's columns, relinking, retention either side of the 30-day line
against real rows, the location-deleted cascade, the key never appearing
in a response, and search → link → live read end to end with Google
answered in-process — including that a live read reporting a different
phone leaves the stored phone untouched. `tests/Smoke/schema-format.php`
puts the new table under the same dbDelta formatting checks as the rest;
dbDelta is idempotent on the live site. Every screen state was driven in a
browser.

**Caught while verifying:** the address comparison first compared
formatted lines, so every British address came out "different" — this
plugin stores `GB` where Google writes `UK`. The stubbed unit fixture had
masked it; the end-to-end integration test exposed it. The "Different"
status was 4.24:1 against the card, under AA for 14px text; it now uses
the notice colour at 7.73:1. The candidate buttons all read "This is my
business", so each is now described by its own place for screen readers.

**Unverified:** no request has reached the real Places API — there is no
Maps Platform key on this site. Google recommends its **logo** as the
attribution "whenever possible", with the text form for limited space; the
text form is used until the official logo asset is added. At phone width
every FoundHint screen is squeezed by the app sidebar, which never
collapses — a layout problem that predates this step.

## Step 13 · Connect service, import, and removing Places — done

`Continue with Google` with **no client id or secret on the user's site**, an
import of the connected profile, and the removal of the Places lookup it made
redundant.

**The connect service.** Google will only return a browser to an address
registered in advance, and a client secret shipped in a plugin download is
not a secret — so one address holds the client for every install:
`foundhint.com/wp-json/fhint-connect/v1/…`, a separate plugin
(`/Users/adnan/sites/foundhint-connect-wp/`). It brokers the sign-in and
token refreshes and **stores no tokens**: the browser carries a one-time
handoff code, and the site collects the tokens server to server, proving it
started the sign-in with a secret the service only ever saw hashed. A
Node version of the same service exists at `/Users/adnan/sites/foundhint-connect/`
for hosts without WordPress.

- `App\Google\ConnectService` — the site's side: registers a sign-in, claims
  the tokens once, refreshes through the service.
- `Tokens` gained `source`, so a refresh goes back to whichever route issued
  the grant. The site's own client stays available under **Advanced**, for
  agencies that want their own project and as a fallback.
- `prompt=select_account consent`, so somebody with a personal and a business
  Google account can choose.

**Import.** `App\Google\Import` reads the mapped profile and shows both
sides; nothing is written until it is ticked. Empty fields are suggested,
filled ones are left alone — this plugin cannot know which of two values is
the newer. A site with **no location yet creates one from Google's address**,
which is the ordinary first run.

**Places removed.** It needed a Maps Platform API key with billing from every
user — exactly the friction this step removes — and the connected path does
the same job better and may actually import. Module, table, routes, screen
and 88 tests deleted; `Database::clear_legacy_places()` drops the table, the
key and the daily event on sites that ran 0.3.0. `FHINT_DB_VERSION` is
`0.4.0`.

**Verified against the real thing.** A live sign-in through foundhint.com
connected `foundhint.plugin@gmail.com`; the import read two real profiles and
filled a location. `tests/Smoke/google-import.php` — 72 assertions,
mutation-tested with eight defects, all caught.
`tests/Integration/database.php` — 132, including the import writing through
the real repositories. The connect plugin — 47 assertions against a stubbed
Google, seven security defects caught (tokens in a redirect, a reusable
handoff, a replayable sign-in, a foreign return address, a wrong secret
accepted, `http` for a remote site, a missing PKCE verifier).

**Caught by real data, not by tests:** two bugs the suites had blessed.
`Profiles::fetch_locations()` percent-encoded the account name into the path,
so Google answered 404 and the sync reported "0 locations" as success — the
old test had asserted the encoded form. And Google writes "open 24 hours" as
`openTime: {}` with `closeTime: {hours: 24}`; read literally that became
`24:00`, storage dropped it, and seven days read as "opens at midnight, never
closes". Both fixed, both now covered, and a sync that reads nothing at all
now reports the failure instead of an empty account.

**Unverified:** Google has approved project `1070959180491`, but the app is
still in Testing — only listed test users can connect until verification is
submitted and passed.

## Step 14 · Encrypting the stored tokens — done

Google's access and refresh tokens are encrypted in `wp_options`. A refresh
token is a live grant to somebody's Business Profile, and it outlives the
database it sits in — travelling into every backup, staging copy and support
export made from that site.

- `App\Core\Secrets` — libsodium `secretbox`, a random nonce per value, and
  a `fhintv1:` marker so ciphertext is distinguishable from a token stored
  before this existed. The key is derived with HKDF from `wp_salt(
  'secure_auth' )`, or from `FHINT_ENCRYPTION_KEY` when a site pins one.
- `Tokens` encrypts on every write and decrypts on read, so no caller knows.
  **Every** write path goes through one private method: `expire()` used to
  put a decrypted record straight back, which would have undone it.
- A value that cannot be decrypted — rotated salts, usually — reads as an
  empty string, so the site reads as disconnected and reconnecting is one
  click. Keeping an unreadable value would mean failing later at Google with
  nothing to explain it.
- `Installer::maybe_run_migrations()` rewrites what is already stored, once.

**What this does and does not protect.** It defends against a leaked
database: a dump, a backup on a shared drive, another plugin reading options.
It does not defend against a compromised server, because anything that can
read the tokens through this plugin can read them the same way. Documented on
the class rather than implied.

**Verified:** `tests/Smoke/secrets.php` — 35 assertions, mutation-tested with
six defects, all caught (a write path storing plain text, encryption skipped
on save, tampering accepted, a fixed nonce, pre-encryption tokens discarded,
and the upgrade never rewriting). On the live site the migration ran by
itself on the next admin load, a real sync returned two profiles, and a
forced refresh through the connect service succeeded with the encrypted
refresh token — still encrypted afterwards.

## Step 15 · REST URLs on plain permalinks — fixed

The Schema screen loaded nothing on this site, and the cause was a bug that
would have hit **every site with plain permalinks**, which is WordPress's
default until somebody changes it.

WordPress serves REST two ways: `…/wp-json/fhint/v1` with pretty permalinks,
and `…/index.php?rest_route=/fhint/v1` without. Two endpoints appended their
own query string to the path — ``/schema?location_id=0`` and
``/logs?mode=all`` — which on the second kind produces two `?`,
and WordPress answers 404. The screen showed empty panels with no error.

RTK Query's own `params` option does not help: it appends to the path
*before* the base URL is joined on, so it makes the same broken URL.
`store/api/baseApi.js` now exports `withQuery()`, which picks the separator
by looking at the REST base, and both endpoints use it.

**Verified on the running site:** `…/schema&location_id=0` and
`…/logs&mode=all` both answer 200, the Schema screen renders its markup, and
no hand-built query strings remain in the store.

## Step 16 · Importing everything — done

Four complaints from a real profile, all of them fair:

**An empty site could not import.** With no business record, the import
refused with "add your business name first" — the typing it exists to avoid.
Google's profile now becomes the business *and* the location on a first run.

**Locations were capped at one.** A business with branches is an ordinary
small business, so `Limits::defaults()` is now unlimited for locations and
services. Capping is still a filter, which is what a plan would use, and the
suites assert that a filtered cap is still enforced.

**Phone and social were not reaching their fields.** Phone was written only
to the location while the screens read the business's; it now goes to both,
except on a branch, where a second shop's number must not answer for the
first. Social links are not location fields at all — Google keeps them as
attributes — so the import makes a second call and maps `url_facebook` and
its siblings onto this plugin's networks.

**Services imported nothing.** Google holds a service twice over: the item on
the location carries only `serviceTypeId`, and the human name lives on the
category. Joining them is the whole job; without it an import would write
`job_type_id:it_consulting` onto somebody's website, so an item whose name
cannot be resolved is skipped rather than guessed.

Also now imported: Google's category as a schema.org type (a mapping table
with `LocalBusiness` as the honest fallback, filterable), and map
coordinates.

**One profile, one location.** Each Google profile keeps its own FoundHint
location and re-imports update it. Every field says which it changes —
"shared by all locations", "this location", "added to your services" —
because importing a branch's name would otherwise rename the business.

`App\Google\ImportMapper` holds the translation; `Import` does the reading,
deciding and writing.

**Caught while building:** the "Different here" badge compared *summaries*,
so "Already set" against "7 days with hours" read as a difference. Hours,
services, social links, the address and the business type now compare by
value, and the screen shows no false differences on a profile that is
already in step.

**Verified against the real account:** both profiles imported — two
locations, nine services, three social links, coordinates, and the business
type mapped from "Pet store". `tests/Smoke/google-import.php` — 73
assertions; `tests/Integration/database.php` — 159, including an import into
an empty site and a second profile becoming a second branch. Six deliberate
defects were caught (social ignored, services unresolved, every category
falling back, a branch overwriting the business phone, an empty site
refusing, and every profile sharing one location).

**Not ours:** Google itself returns "It consulting" for
`job_type_id:it_consulting`, and the import keeps names verbatim.

## Step 17 · WordPress.org readiness — done

A submission pass over the whole plugin: standards, security, escaping, text
domain, readme and packaging.

**The packaging was the serious one.** `vendor/` holds 18 MB of PHP_CodeSniffer
and WPCS, the build did not exclude it, and the plugin autoloads through
Composer at runtime — so the zip would have shipped the development toolchain
and been refused. The build now excludes `vendor/` and installs a production
autoloader into the package (`--no-dev --classmap-authoritative`), which was
then *proved* to resolve the plugin's classes rather than assumed. 18 MB of
dev tooling became a 92 KB autoloader; the zip is 567 KB.

Two more packaging defects, both of which break installation or review:

- **The zip had no top-level folder.** WordPress unpacks a plugin zip straight
  into `wp-content/plugins`, so a flat archive scatters the plugin across that
  directory. Now nested under `found-hint/`.
- `.DS_Store` and `.npmrc` were being carried in, because `*.DS_Store` does
  not match a dotfile at the root.

Also excluded now: `src/`, `tests/`, `docs/`, every tooling config, and
`CLAUDE.md`.

**Translations never worked in the admin app.** Every string in the React
bundle goes through `__()`, but without `wp_set_script_translations()`
WordPress has no way to know which script carries which text domain, so a
translation file would be loaded for nobody and the UI would stay English in
every language, silently. Registered, and `languages/found-hint.pot` is now
generated by `npm run i18n` — 617 strings, **none using the wrong text
domain**, which that script checks and fails on.

**readme.txt**, with the section WordPress.org cares about most for this
plugin: **External services**. Both are disclosed — Google's Business Profile
APIs, and the FoundHint Connect sign-in service — saying what is sent, when,
what is *not* sent (business data never reaches foundhint.com), and linking
each one's terms and privacy policy. `Tested up to` is the version everything
here was actually verified on.

**LICENSE** (GPL-2.0) added, and the vendored `libs/assets.php`
(kucrut/vite-for-wp, GPL-2.0-or-later) gained the direct-access guard every
other file in the plugin has, with its provenance written above it.

**Audited and found clean:** every PHP file guards against direct access; no
`eval`, `extract`, `unserialize` or shell functions; the one
`file_get_contents` reads a fixed plugin asset; JSON-LD is encoded with
`JSON_HEX_TAG`; `uninstall.php` checks `WP_UNINSTALL_PLUGIN`; every REST route
has a real capability check and validated arguments (351 assertions);
superglobals are read only in the OAuth callback, each one unslashed and
sanitised. PHPCS (WordPress-Extra + PHPCompatibilityWP) passes across 97
files.

**FoundHint Connect** gained its own `phpcs.xml.dist` and passes it.

**Still for the author, not the code:** screenshots (WordPress.org keeps those
in the SVN `assets/` directory, not in the zip), a wordpress.org account named
as `Contributors`, and the plugin-directory submission itself.

## Step 18 — Submission, and the reviews feature

**The directory submission.** The slug is `foundhint-local-seo`, and because
WordPress.org requires the text domain to equal the slug, `found-hint` was
renamed across 143 occurrences in 40 PHP files and 653 in 33 JavaScript ones,
with `languages/foundhint-local-seo.pot` regenerated (618 strings, none on
another domain — the generator fails if there are). Plugin URI and Author URI
were split (`/local-seo/` and `/about/`), the readme's policy links point at
the live pages, and the Vite dev preamble's URL is escaped for its JavaScript
context with `wp_json_encode( ..., JSON_HEX_TAG | ... )` after the review team
flagged it. Verified with WordPress.org's own Plugin Check against the built
zip: **0 errors**, 47 warnings, all either table names from `fhint_table()`
or vite-for-wp's own hook names. Ownership was proved by TXT record on
foundhint.com.

**Reviews.** A new `wp_fhint_reviews` table (DB version 0.5.0, dbDelta
idempotent), `App\Review\` holding the mapper, the repository, the sync and
the one shared rule, three REST routes, and a screen.

Reviews are read **on demand and never on a render path**; the screen, the
figures and anything downstream read stored rows. They are shown in the admin
and deliberately **not published to the front end** — review content belongs
to its author and to Google, and republishing it as the site's own structured
data is not a decision this plugin makes for an owner.

Three things the tests pin down, each proved by breaking the code and
watching them fail: `STAR_RATING_UNSPECIFIED` is 0 and is **left out of the
average** rather than counted as zero stars; an anonymous reviewer keeps
**no name and no photo**, even when Google sends them; and a whitespace-only
reply still counts as unanswered. A sync **upserts on Google's review id**
and prunes what Google no longer returns.

One thing worth recording about the test pass: the "unrated is excluded"
rule was first written twice — once in SQL, once in PHP — and *neither*
mutation could make a test fail, because each guard covered for the other.
The duplicate was removed so the rule lives in one place and can be proved.
Two guards for one rule read as safety and are the opposite.

**Verified live.** 13 real reviews across two locations. Reviews needed the
**legacy My Business API** enabled on the project — a third service beyond
Account Management and Business Information — which Google reported as
`SERVICE_DISABLED` until it was switched on. The refusal surfaced as an
error rather than "0 reviews read", which is the trap the profile sync fell
into once; an owner shown a zero would conclude nobody had reviewed them.

The strongest check is that our figures match Google's own: per location,
Google reported `averageRating` of 5 and 4.5999999046326 against our 5 and
4.6, over counts of 2 and 11. Dates, ratings and anonymity were clean across
all 13 rows — no row missing a date or a rating, and no anonymous reviewer
carrying a name.

**One bug the tests did not catch, and now do.** The controller returned its
payload at the top level instead of inside the documented `{data, meta}`
envelope. Every route test passed — they assert registration, capabilities
and argument validation — and the screen simply rendered "No Google
locations yet" against a 200 that held the locations. It was found by
opening the page in a browser, which is why that step is not optional. The
integration suite now asserts the envelope on these routes, and dropping it
again fails three checks.

## Step 19 — Google category search

`GET /fhint/v1/google/categories` searches Google's Business Profile
categories, and a business now stores a category as **Google's id with
Google's name beside it** — the id is what a push sends.

**The list ships with the plugin** rather than being fetched:
`includes/App/Google/data/google-categories.json`, 4,053 categories, built by
`npm run categories:update` from
github.com/lobstrio/google-business-categories. Choosing a category is one of
the first things a new site does, usually before Google is connected, and a
search box that needs an approved API connection to show its first suggestion
does not work. Nothing is downloaded by the site at runtime.

Searching is in memory (about 2 ms): an exact name, then a prefix, then a
later word starting with it, then anything containing it, then a match found
only through another wording, which says so in `matched`.

**Saving is validated on the server against the same list**, in
`Business::sanitize()` and `Business::validate()`: the name is taken from the
list and never from the request; an unknown id is refused; additional
categories are stored as `{ id, name }` pairs, capped at Google's 9, without
repeats and without the primary one. The plain text field on the current
Business screen keeps working — a name Google uses is tied to its id, and a
freehand one clears the id so a stale one cannot survive a rename.

Proved by `tests/Smoke/google-categories.php` (60 checks, 11 deliberate
defects, all caught) and through REST and MySQL in the integration suite.

**Three things about the data, found by looking rather than by reading its
README.** It claims 1,196 categories with more than one name; 1,187 of those
"variants" merely repeat the main name, so only 9 carry a real alternative
("Physician" for Doctor). Two different categories are both called "Swimming
pool", which is why a client must key on `id` and show `bucket`. And the
repository has **no licence file** — its README says "Free to use", which is
not a licence. It is credited in `readme.txt`; before a release, either get
that in writing or replace the file with Google's own `categories.list`,
which the approved project can call and `fhint_google_reference` was built
to cache.

**Not built:** the chooser on the Business screen still is a plain text
field, and the Google import does not yet set `primary_category_id`.

## Step 20 — The profile: read whole, saved a section at a time

`GET /fhint/v1/profile` returns the Business Profile screen as one document —
`info`, `address`, `hours`, `social`, `attributes`, `services`, `media` — and
`PATCH /fhint/v1/profile` saves one section, `{ section, fields }`, answering
with that section as it now reads. Saving stores to this site only; nothing
on the route contacts Google.

**It owns no rules.** `App\Profile\Profile` dispatches to one class per
section, and each delegates to the entity that already validates that data —
`Business`, `Location`, `OpeningHours`, `Service`. A value saved here and the
same value saved through `/business` or the setup wizard pass through one set
of rules.

What is new underneath it:

- **Description rules**, in `Business::validate()` so every route gets them:
  750 characters at most, and no web address. Both are things Google refuses
  at the push, long after the owner has moved on. The link check leaves out
  two-letter country endings on purpose — "open late.in an emergency" is a
  missing space, not a domain.
- **Special hours** (`SpecialHours`, `SpecialHoursRepository`). The period
  rules are the weekly ones, reached by lending each date a weekday and
  calling `OpeningHours::validate()`, rather than written a second time.
- **Attribute values** (`LocationAttributes`, `LocationAttributeRepository`).
  `null` withdraws an answer, which is not `false`; every value written is
  marked dirty for the push to come.
- **Description history**, appended when the wording changes and not when it
  is merely saved.
- **Services as one ordered list**: an entry with an id is updated, one
  without is created, one left out is removed — the same contract Google's own
  service list has. Everything is validated before anything is written.
- **The address locks** once the location is mapped to a Google listing.

**Three things found by testing rather than by reading.**

Saving hours through the new route did not mark the data as changed. On
`/locations` the location update beside the hours does that; here there is no
such update, so the cached schema would have gone on publishing the old
opening hours. `Hours::save()` stamps it, and a check proves it.

Deleting a location left its special hours, attribute answers and photo
records behind, and deleting the business left its description history. There
are no foreign keys, so nothing would ever have removed them. The cascades
now cover all four, with a check each.

One deliberate defect survived the first run: sending only the week wiped the
special days, and no check noticed, because only the reverse had been tested.
There is now a check for each direction.

Proved by `tests/Smoke/profile.php` (52 checks) and 67 more through REST and
MySQL; 19 deliberate defects, all caught.

**Decided for the push, not built:** one click, but not one request. A
streamed response is held back by too many hosts and proxies to be relied on,
so publishing will be a *plan* request that returns the steps, then one
request per step, each answering with its own result. Recorded in
`docs/PROFILE-DATA-MODEL.md`.

**Not built:** the screen itself, the push, photos, and Google's reference
lists — so `attributes.definitions` and `services.google_types` are empty and
attribute ids are checked for shape only.

## Step 21 — Planning a publish to Google

`POST /fhint/v1/profile/publish/plan` compares this site's profile with the
mapped Google listing and answers with the **steps** a publish would take —
each naming its fields, from what, to what — without sending anything.
`App\Google\Push\GoogleFormat` converts stored data into Google's shapes,
`Plan` compares, `Publisher` reads Google and gathers both sides.

**A plan never clears.** Google erases a field named in the update mask with
no value, and this site cannot tell "never typed here" from "removed on
purpose", so a field it has nothing for goes under `skipped` with the value
Google shows, never into the mask. The same caution runs through the rest: an
unfilled weekday keeps Google's hours, extra categories and extra phone
numbers Google holds are sent back rather than dropped, and only attribute
answers changed here are named.

**Every comparison is made on Google's shape, by one function, on both
sides** — the stored value is first converted into what it would send. That is
what stops a plan reporting a change where there is none; hour 24 today and
hour 0 tomorrow, a number with and without its country code, a link with and
without `www`, all compare equal.

**Checked against a real listing**, read-only. The shapes it returned are the
fixtures: times as objects, categories as `categories/gcid:…`, service types
listed under the category, `metadata.canModifyServiceList`, and the CID inside
`metadata.mapsUri`. Its attribute list has `url_twitter` and no `url_x`, and
**no Yelp attribute** — so X maps to twitter and a Yelp link stays on this
site, both corrections to what had been assumed. A site freshly imported from
that listing plans zero steps.

**A defect in the import, found by the plan.** A service imported from Google
kept its name and lost how Google holds it, so a publish would have replaced
one of Google's own structured services with a free-form copy of the same
name. `ImportMapper` now records `google_item_type` and
`google_service_type_id`, and reads the price from the service item, where
Google documents it.

**A mistake worth recording.** To show a plan with real steps, trial edits
were made on the development site inside a database transaction, to be rolled
back. They were not rolled back: the hours and attribute repositories open
their own transactions, and in MySQL starting a transaction commits the one
already open. The data was restored from the listing and verified by planning
again. An outer transaction is not a sandbox for code that manages its own.

Proved by `tests/Smoke/publish-plan.php` (71 checks), five more in the import
suite and 14 through REST against a stand-in for Google; 22 deliberate
defects, all caught — one only after a check was added for the form actually
sent, since two spellings of midnight compared equal by design.

**Not built:** the step request that performs a publish; photos; attribute
definitions (fetched, shape known, not yet stored).

## Step 22 — Running a publish step

`POST /fhint/v1/profile/publish/step` runs one step of a plan: the only route
in the plugin that changes anything on Google. `Client::patch()` is the one
write the HTTP client knows.

**What reaches Google is only ever what the plan showed.** The step is planned
again before it is sent, from a fresh read of the one resource it touches, and
the fingerprint the caller brings must match. An edit in another tab, or in
Google's own dashboard, between reading the plan and pressing publish makes the
fingerprints differ, and nothing is sent.

**A refused value points at its field.** Google's message for a bad value is
"Request contains an invalid argument"; its error details carry the reason and
the field (`PROFILE_DESCRIPTION_CONTAINS_URL` on `profile.description`). Those
become the usual `fields` shape with `google.*` codes, so the message lands on
the input exactly as a local validation error would.

A real step records `pushed_at` on the listing (database version 0.8.0) and
clears the changed flag on exactly the attribute answers it sent. A
validate-only step records nothing.

**Checked against the real listing in Google's validate-only mode**, which
checks a request and saves nothing — confirmed by reading the listing back
after every batch and finding it identical. Every shape the plugin builds was
accepted: hour 24 for midnight, a shift past midnight, an all-day day, special
hours, a category as a resource name, both phone formats, and services with
the price on the item. A seven-field step built by the plan's own code was
accepted in one request. Google's refusals confirmed two rules already
enforced here — no link in a description, and exactly 750 characters.

Three things learned from it: Google refuses a website on a domain that does
not exist (`INVALID_URL`), which no local check can know; a quick run of
edits is refused without detail, so steps must stay sequential; and a
stand-in for Google that answers every request will silently replace a
refusal returned by a filter that ran before it — the first version of the
refusal check passed for that reason and proved nothing.

**No real write has been made to a live listing.** The step is proved against
a stand-in (36 checks, 13 deliberate defects, all caught) and by validate-only
calls; the first real publish is still to be done, on a listing the owner
names.

## Pending

Everything in the Free plan's first cut is built. What remains is the
prototype's work that has no engine yet:

1. **Landing pages**, **ranking grid**, **performance** and
   **recommendations** — each needs its engine before any screen.
2. **Replying to a review from the admin**, and **Google posts** — the first
   writes back to a surface the public sees, so each needs a dry run and a
   failure path before it ships.
3. **Google performance** — the same connection, needing its API enabled.


## Step 23 — Business profile screen

`src/admin/pages/profile/` is the Business screen now (`#/business`): seven
collapsible sections over `GET /profile`, saved with one `PATCH /profile` per
changed section from a single save bar at the foot of the page. No section has
its own Save button; each header carries its state instead. The Business
sidebar entry has no sub-items. The older form survives at
`#/business/details` for the fields only the site's markup uses (legal name,
business type, email, logo, price range, founding date).

"Send to Google" opens a dialog that plans first (sends nothing), then runs
one step request at a time and reports each.

Drawn in the design but not built, because nothing stands behind them yet:
the AI description writer, category suggestions, the live map, booking /
ordering / texting / WhatsApp links and the wider directory list, Google's
attribute menu (`definitions` is still empty), structured service types, CSV
import, and photo upload.

## Step 24 — Profile header and location switching

Every profile route takes `location_id` (0 or absent = the primary location);
`Profile::select()` is called first by each route, so the choice never carries
from one request to the next. `GET /profile` `meta` gained `location`,
`locations` and `reviews`. A publish now compares the chosen location with
its own listing.

The screen's header (`pages/profile/components/ProfileHeader.jsx`) shows the
business and location, the listing's rating, "Switch location" when there is
more than one, and "View on Google"; the choice lives in the address as
`#/business?location=ID`. Not drawn: the notification bell, the account
avatar, and "Upgrade to Pro" (there is no Pro page to send anyone to yet).

## Step 25 — What only Google can supply

- **Categories import.** `categories` is a field on the Google import: the
  main and extra categories arrive with Google's ids. From the main
  location's listing only — a branch does not re-categorise the business.
- **The listing's Maps id** is read from `metadata.mapsUri` on a profile sync
  and on a refresh; it was never being filled in.
- **`POST /profile/google/refresh`** (`App\Profile\GoogleRefresh`) reads the
  attributes Google offers the listing (`App\Google\AttributeCatalog`, stored
  in `fhint_google_reference` under the listing's name), the answers it
  holds, and its photos (`App\Media\MediaSync`). The screen runs it once on
  first opening a mapped listing, then on request.
- **Photos** can be chosen (`POST /profile/media`), sent one at a time
  (`…/{id}/publish`: start upload, bytes, create) and taken back while still
  waiting. `Client` gained `post()` and `upload()`.
- **The Attributes section** is drawn from Google's list: tick boxes, single
  and multiple choices. Attribute answers already went to Google as step two
  of "Send to Google".
- **The address map** is Leaflet (bundled) over OpenStreetMap tiles, declared
  in `readme.txt`.

Not built: removing a photo from Google, customer photos, videos. No photo
has been sent to a real listing from here — the upload is proved against a
stand-in for Google in `tests/Integration/database.php`.

## Step 26 — Categories follow the location

Two Google listings under one account can be two kinds of business, and with
categories kept only on the business, saving either overwrote the other.
`fhint_locations` gained `primary_category`, `primary_category_id` and
`secondary_categories` (DB 0.9.0); `App\Location\LocationCategories` resolves
location first, business second, the way contact details already do. The
primary location's categories remain the business's. The profile, the Google
import and the publish plan all read through it.

`Installer::check_update()` now also re-runs dbDelta when the stored
`fhint_db_version` differs from `FHINT_DB_VERSION`. Before this a column added
without a plugin version bump never reached an existing install.

## Step 27 — Switching location reads Google

Switching location on the profile now runs `POST /profile/google/refresh` for
the location arrived at, as well as on first opening a mapped listing. The
refresh also **fills in categories where a location has none** (never
replaces one), so a second listing shows its own category instead of the
first one's. `meta.refresh.categories` says whether it did.

## Step 28 — Service popup and Google's ready-made services

The service form (`pages/profile/components/ServiceDialog.jsx`) follows the
design: a Custom name / Google service switch, joined currency and price,
counters, a "Show on Google" switch and a fixed footer. The Google service
list is the listing's own — `categories.*.serviceTypes`, stored by the refresh
as `service_type` rows in `fhint_google_reference` and returned as
`data.services.google_types` (`{ id, label, category }`). A service saved from
that list is `google_item_type: structured` with its `google_service_type_id`,
which is what a publish already sends as a `structuredServiceItem`.

Not built: "Write it for me" (no text generation behind it).

## Step 29 — Guided import after connecting Google

A first successful Google sign-in now lands on `#/setup/google`
(`Connection::landing_route()`), not the Google screen. That screen
(`src/admin/pages/setup/google.jsx`) picks the listing and runs the import in
six steps — `Import::STEPS`, `POST /google/import/step`, one request each —
then opens the Business Profile. The first step reads Google and the rest
reuse that read from a two-minute transient. "I'll do this later" goes to the
Business Profile without importing.

## Step 30 — Front-end guide for the import and the profile

`docs/frontend/`: every route the guided import and the
Business Profile screen use, with real request and response shapes, the
per-section save rules, error codes, and the rules that are easy to get wrong.

## Step 31 — `docs/frontend/`

Two front-end guides, each standalone: `docs/frontend/setup-widget.md` (the
Google sign-in and six-step import) and `docs/frontend/business-profile.md`
(the profile screen). Every endpoint is given with its method, a request
sample, a response sample and its errors. `docs/SETUP-WIZARD-API.md` was
folded into the first.

## Step 32 — Switching to listings not yet imported

`GET /profile` `meta.listings` lists every listing on the Google account. The
switcher shows when there is more than one location-or-listing, so an account
with two listings can switch before the second is imported. Choosing an
unimported listing calls `POST /profile/listing` (`App\Profile\ListingOpener`),
which creates a new location, links it, and imports only location-level
fields — the business's shared name, description, social links and services
are left alone.

## Step 33 — Name, description, phone and website per location

`fhint_locations` gained `business_name` and `description`
(`fhint_description_history` gained `location_id`; DB 0.10.0).
`App\Location\LocationDetails` resolves name, description, phone and website
location first, business second, field by field — the rule categories already
follow. The primary location's values are the business's. The profile save,
the Google import (`write_location` for a non-primary location), the listing
opener, the publish plan and the refresh (fills an empty name or description)
all go through it. Social links and services are still shared.

## Step 34 — Social links and services per location

`fhint_locations.social_profiles` (NULL = use the business's; once set, the
whole set is the location's) and `fhint_services.location_id` (0 = the
business's own list, shown by the primary location), DB 0.11.0. Service slugs
are unique per list: the unique key is now `(business_id, location_id, slug)`,
and `Installer` drops the old `business_slug` key once. A non-primary location
has its own service list from the start. The profile, import, listing opener,
publish plan and refresh (fills a location's links when it has none) all go
through `LocationDetails::social()` / `services_list()`. Deleting a location
deletes its own services. The schema output, audit, dashboard and `/services`
still read the business's own list.

## Step 35 — Structured data per location

The front end now prints `Graph::build_site()` (cached as `SchemaCache::site()`):
one LocalBusiness per publishable location, each from its own `Nap`
(name, description, links and type now resolve per location) and its own
service list. The primary keeps `#localbusiness` / `#services`; others are
`#localbusiness-{id}` / `#services-{id}`. Branches without a name of their own
carry `parentOrganization`. Unpublishable locations are skipped individually.
`fhint_schema_locations` filters which locations a page prints. The admin
preview (`GET /schema`) and the audit still look at one location at a time;
the audit now reads that location's own services.

## Step 36 — Locations and Services screens removed

Both are tabs of the Business profile now, so their sidebar rows and screens
(`pages/locations`, `pages/services`) are gone. `#/locations`,
`#/locations/{id}` and `#/services` redirect to `#/business` with `?tab=` (and
`?location=`), which `ProfileTabs` reads as the tab to open. The dashboard's
links point at the tabs. The `/locations` and `/services` REST routes stay —
the dashboard, the plan line and the setup wizard still read them. The
opening-hours editor the setup wizard uses moved to `pages/setup/components/`.

## Step 37 — Reviews follow the selected location

The Reviews screen shows one location's reviews, never every location's: it
opens on the location last chosen in the Business profile's switcher (kept in
this browser by `src/admin/lib/selectedLocation.js`), else the main
location's listing. "All locations" is gone, and **Read from Google** reads
only the listing on screen. Choosing a listing on Reviews also becomes the
Business profile's location. `/reviews/state` `locations[]` now carries each
listing's `location_id`.

## Step 38 — Audit and schema screens per location

`GET /audits` takes `location_id` and answers that location's latest run and
history (`AuditRepository::latest()` / `history()` take location ids;
`ids_for()` folds location-0 runs into the primary's). `GET /schema` refuses
an unknown location. Both screens carry a `LocationPicker`
(`src/admin/components/`) backed by `useSelectedLocation()`, which shares the
remembered location with the Business profile and Reviews. Running the audit
audits the location on screen. The dashboard stays on the primary location.

## Step 39 — Dashboard per location

`GET /dashboard` takes `location_id`; a named location shows only its own
audit, the primary falls back to any. The screen has the shared
`LocationPicker`; its setup checklist and services count come from that
location's `GET /profile`. The Google card, the Business completeness and the
Locations count stay site-wide. `useSelectedLocation()` now returns `ready`,
and the dashboard, audit and schema screens wait for it, so the main
location's figures are never fetched and shown for a moment first.

## Step 40 — One location bar on every screen

The Business page's header (name, logo, rating, **Switch location**) moved to
`components/location-bar/` and is rendered once by the root layout, above
every screen except setup. The selection lives in a
`SelectedLocationProvider` context, so switching in the bar moves the
Dashboard, Business, Reviews, Audit and Schema screens together; the
per-screen `LocationPicker` is gone. The Business page registers a guard
that confirms before a switch discards unsaved edits. The logo square shows
the listing's Google logo, or two capital initials when there is none.

## Step 41 — Replying to reviews

Each review on the Reviews screen can be answered from here: **Reply** opens
a box, **Post on Google** sends it, and an existing reply has **Edit** and
**Delete** (which asks first). `PUT /reviews/{review_id}/reply` posts or
replaces the reply, `DELETE` removes it — `App\Review\ReviewReply`, through
new `Client::put()` / `Client::delete()` on Google's v4 reply endpoint.

The stored reply changes only after Google accepts, so the screen never
shows a reply the public cannot see. The reply is plain text, at most 4,096
**bytes** (Google's measure, so Bengali or emoji count more than one each),
checked on the server with per-field codes `review.reply.required` /
`review.reply.too_long` and counted down live in the box. Deleting a reply
Google no longer has succeeds and clears the stale copy. Smoke
(`reviews.php`) covers the validation and the request Google receives;
`database.php` covers the full save/refuse/delete paths and the routes with
Google answered in-process.

## Step 42 — Google is required

With no Google account linked (`Connection::is_linked()`, i.e. tokens stored;
"needs reconnect" counts as linked):

- **Nothing is shown.** `GET /profile` returns every section in its usual
  shape with the values emptied (`Profile::blank()`), so stored details never
  reach the browser; `meta.google.linked` is `false`. Nothing is deleted —
  linking again brings it all back.
- **Nothing can be changed.** The 16 routes that write business details use
  `AbstractController::google_write_check()` and answer
  `409 fhint_google_required`. The Business tabs and the details form sit in
  a disabled `<fieldset>` under a Connect Google prompt (`GoogleRequired`);
  the top location bar is hidden.
- **No skipping setup.** The dashboard is the Get Started introduction
  whenever no account is linked, without "Skip to dashboard"; Option B's
  "Fill in my business details" link (a dead end now) is gone. The old
  `#/setup` wizard's skip button is removed too.

`rest-routes.php` proves every write route is guarded and every read is not;
`database.php` proves the empty read, the refused writes and that the data
survives.

## Step 43 — Google Maps on the Address tab

The address map is now Google's own embed (`google.com/maps?q=…&output=embed`,
no API key) in place of Leaflet and OpenStreetMap tiles; `leaflet` is removed
from the bundle (about 140 KB). It centres on the location's coordinates
when it has them; Google does not always send a pin (FoundHint's listing has
none), so without one it searches for the business by **name and address**,
which finds the listing itself. "Open in Maps" follows the same rule. The
frame sends no referrer. Declared in `readme.txt` under External services.

## Step 44 — Opening date

The Info tab has **Opening date**, a month field. Google keeps it per
listing as `openInfo.openingDate` (`{ year, month, day }`, day optional) and
shows "Opened March 2014"; this plugin keeps it **to the month**
(`App\Business\OpeningDate`): stored on the first of the month, shown as
`YYYY-MM`, sent as year + month with no day, compared by month so a day
Google holds is never "changed". Up to one year ahead, as Google allows.

- **Stored** per location like name/phone/website: the main location's is
  the business's existing `founding_date`; any other location has the new
  `locations.opening_date` (DB 0.12.0), NULL = the business's
  (`LocationDetails::BUSINESS_KEYS` maps the name).
- **Read** by the import's `identity` step and by opening a listing
  (`openInfo` added to the read masks), and by *Refresh from Google* — only
  into an empty date, primary location included.
- **Sent** by *Send to Google*: the plan names only `openInfo.openingDate`,
  so the open/closed status is never touched; no date here is skipped,
  never a clear.

On the live listings Google holds a date only for the pet shop (11 Oct 2025 →
2025-10); FoundHint's listing has none.

## Step 45 — Additional phone numbers

The Info tab lists **Additional phone numbers** under the main one: up to
two, one box each with a remove button, "+ Add a phone number", and an
"x of 2 used" count (`info/AdditionalPhonesField.jsx`). Google keeps them as
`phoneNumbers.additionalPhones` beside `primaryPhone`.

- **Rules** (`App\Business\AdditionalPhones`): blanks and repeats dropped,
  comparing numbers the way a publish does (`GoogleFormat::same_phone`, so
  "+1 512 555 0199" repeats "(512) 555-0199"); at most two
  (`business.additional_phones.too_many`); each a phone
  (`business.phone.invalid` on `additional_phones.N`) and not the main
  number again (`business.additional_phones.same_as_main`). A list that is
  too long is refused, never cut.
- **Stored** like the social links: the business's new `additional_phones`
  (JSON) for the main location; a location's own `additional_phones`, NULL
  = the business's, a list (even empty) = its own (DB 0.13.0). Also
  accepted by `/business`.
- **Read** by the import's `contact` step, opening a listing, and *Refresh
  from Google* — only when nothing is held here.
- **Sent** with the main number: `phoneNumbers` is one field to Google, so
  the plan sends both sides in one mask entry, each side keeping Google's
  value when only the other changed; none here is skipped, never a clear.

Neither live listing has extra numbers on Google yet.

## Step 46 — Booking

A **Booking** tab after Social Links with three options — Google's *Book*
and *Chat* buttons, all link attributes on the listing:

| Option | Google attribute | Sent as |
|---|---|---|
| Book an appointment link | `url_appointment` | the link |
| Texting number | `url_text_messaging` | `sms:+8801712345678` |
| WhatsApp link | `url_whatsapp` | `https://wa.me/…` |

Formats from Google's own guide
(developers.google.com/my-business/content/whatsapp-text).

- **Rules** (`App\Business\BookingLinks`): links must be http(s) with a real
  host; the texting number is stored international (`+` and 8–15 digits);
  WhatsApp must point at wa.me / whatsapp.com. Text that is not a link is
  kept as typed and refused — `esc_url_raw()` would otherwise turn "not a
  link" into a valid-looking `http://not%20a%20link`.
- **Stored** like the social links: `booking_links` JSON on the business and
  on a location (NULL = the business's), DB 0.14.0. New profile section
  `booking`, between `social` and `attributes`.
- **Offered per listing.** Google does not give every listing all three
  (the pet shop has no appointment link). `AttributeCatalog::offers()`
  reads the stored menu; the screen notes a field Google does not offer,
  and the publish plan skips it (`not_on_google`) rather than send a
  request Google would refuse. An unread menu holds nothing back.
- **Read** by the import's `contact` step, opening a listing and *Refresh
  from Google* (only when none are held here); **sent** in the attributes
  step, each link its own attribute.
- **Texting number UI**: a country code picker (235 countries, names from
  `Intl.DisplayNames` in the admin's language, starting on the location's
  country) and the number. A national number drops its trunk 0 (except on
  Italy's plan); one written with + or 00 is taken whole.

Neither live listing has booking links on Google yet.

## Step 47 — Booking moved into Social Links

The booking links are no longer a tab of their own: the Social Links tab has
a **Booking and messaging** group between "Shown on your Google profile" and
"Directories and review sites", drawn as the same cards (icon, name, status
tag, input). `LinkCard` grew optional `meta`, `icon`, `stateOf`,
`badMessage`, `note` and a `children` render for the texting number's
country-code picker; `social/BookingCards.jsx` holds the three. The WhatsApp
card uses the Simple Icons WhatsApp mark.

Server side the `booking` profile section is gone; `social` reads
`booking_links`, `booking_offered` and `country` and saves `booking_links`
and/or `social_profiles`, checking both before writing either. The client
model is `{ profiles, booking }` and sends only the part that changed, so a
new Facebook link never gives a branch its own booking set by accident.

## Step 48 — Country codes on every phone number

The main phone number and each additional number now use the same control
as the booking texting number: a country picker and the number. It is one
shared component, `components/PhoneNumberInput.jsx` (BookingCards' private
copy is gone), with `info/PhoneField.jsx` laying out the main number and
`AdditionalPhonesField` using it per row. A number edited there comes out
international (`+8801518984873`); a stored national number (Google's
`01518-984873`) is shown under the location's country — `info.country` is
new in the Info read — and left untouched until edited, so opening the form
changes nothing. No server rule changed: international numbers already pass
`Validator::is_phone`, and "same as the main number" and the publish plan
already compare with or without the country code.

## Step 49 — Service area

After the map on the Address tab: the places a location serves, as chips,
"x of 20 used" (`address/ServiceAreaField.jsx`). Stored per location, like
the address — `locations.service_area` JSON (DB 0.15.0), each
`{ name, place_id }`.

**Google requires a place id for every place** (`serviceArea.places.placeInfos`,
`placeId` required, max 20), and only the Places API — which needs a key
this plugin does not hold — can find one. So (`App\Location\ServiceArea`):

- places read from Google keep their ids and are sent back; the plan
  compares by id and sends the list whole, keeping Google's `businessType`
  and `regionCode` (a removal here is a removal there);
- a place typed here has no id: kept, drawn dashed and labelled "website
  only", published as `areaServed`, and skipped on publish with the new
  reason `no_place_id`. A malformed id is dropped, never trimmed into a
  made-up one;
- typed places alone never clear Google's area.

The service area saves even when the address is locked by a mapped listing
(only address fields are refused), and the address is validated only when
it changes. Read by the import's `address` step, opening a listing and
*Refresh from Google* (only into an empty area); the website markup names
every place as schema.org `areaServed`. Live: the pet shop's 7 places came
across with their ids, and its publish plan shows the area unchanged;
FoundHint's listing has none.

## Step 50 — Photos tab redesigned

To the design: three cards in a row — **Logo** (a square dashed drop zone
on a tinted panel), **Cover photo** (a wide dashed zone) and **Add photos to
your gallery** (a tinted dashed card, upload icon, "Choose photos" pill) —
then a dashed "Your Google photos will appear here" card when there is
nothing yet. Each zone says "Your logo / or browse files", opens the file
picker, and now also takes files **dropped** onto it (`Picker` gained
`droppable`; one slot takes the first of several). With a photo, the zone
shows it with its status tag and an **Upload another** button appears; the
gallery card's button becomes "Add more photos". Dropped files go through
the same add action and server checks as chosen ones. Corners are explicit
(`rounded-[12px]`): the theme's base radius is 0, so `rounded-xl` would
render square.

## Step 51 — "Coming soon" banners, and the notice colours restored

`components/ComingSoonBanner.jsx` — a sparkle icon, a bold title, a "Coming
soon" tag and one line of what is coming — sits under the page title on the
Dashboard ("Advanced dashboard coming soon!"; the ordinary dashboard, not
the first-run introduction), Schema ("Advanced schema coming soon!") and SEO
audit ("Advanced SEO audit coming soon!", on both the empty and the results
screen). A plain `<aside>`, not a live region: it never changes.

**Fixed on the way:** `--notice`, `--notice-border` and `--notice-foreground`
had lost their values in the tooltip commit (2f7595c), so every
`bg-notice` / `border-notice-border` — the plan-limit `NoticeBar`, the
location bar's initials tile, the "Add a phone number" button — rendered
transparent with a near-black outline. Restored in `:root` from 12a12c2
(`#fff1eb`, `#ffc9af`, `#8a3b12`), with a comment saying what breaks without
them.

## Step 52 — Reconnecting no longer duplicates locations

**Bug:** disconnecting empties `google_locations` (the listing → location
links), so after reconnecting the same account the import could not tell
which location each listing was. With more than one location it could not
guess either, and created new ones — every reconnect doubled the business.

**Fix:** each location now remembers its own listing in
`locations.google_location_name` (DB 0.16.0, keyed). It is written by
`GoogleLocationRepository::map()` (moved, if the listing was another
location's), cleared only by a deliberate `unmap()`, and untouched by a
disconnect. When a listing is stored for the first time — including after a
disconnect — `upsert()` links it straight back to the location that
remembers it, so the import updates that location. A one-off migration
(`Installer::remember_google_listings()`) copies existing links into the new
column; it only fills empty memories. Integration tests replay link →
disconnect → reconnect, deliberate unlinking, moving a listing and the
migration; each part mutation-tested.

**Dev data repaired** (with the owner's go-ahead): the reconnect had made
copies #3 (FoundHint) and #4 (pet shop). The listings were re-linked to #1
and #2 and the copies deleted with their photos, attributes, services and
hours (nothing had been edited on them; a JSON backup was taken first). A
refresh then confirmed FoundHint's opening date (Sep 2026) from Google.

## Step 53 — "Token has been expired or revoked." handled

That text is Google's own, for a refresh token it no longer honours
(`invalid_grant`). On the OAuth route the plugin already caught it, cleared
the dead connection and said "Google has expired or withdrawn this
connection. Connect again to restore it." On the **connect-service** route
it did not: the service answers `{ code, message }` (WordPress-REST style),
`ConnectService::post()` read only `error`, so `invalid_grant` was never
seen — Google's raw message reached the screen, and the dead tokens stayed
stored, so the site kept claiming to be connected and every Google request
failed the same way until a manual disconnect/reconnect. `post()` now reads
`code` (then `error`). Smoke tests use the live service's real response
shape; reverting the fix fails four checks. Verified against the live
service with a fake refresh token (no real connection touched).

## Step 54 — readme.txt to WordPress.org standard

`readme.txt` rewritten from the product description doc (Claude Docs,
"FoundHint – Local SEO WordPress Plugin Description"), in WordPress.org's
format: title "FoundHint – Complete Local SEO, Schema, GMB Multi-Location &
Reviews Management", 133-character short description, 5 tags, Description /
Installation / FAQ / Screenshots / Changelog / Upgrade Notice, and the
External services and Bundled resources sections kept (External services now
also names reviews, replies, service area, booking links and opening date).
Every feature was checked against the code: what exists is described as it
works today; what does not is marked *(Coming soon)* — 21 items, including
the fix workflow's preview-and-confirm step, which the doc promises but the
plugin does not have (a fix applies on its button and the audit re-runs).
The plugin header's name and description now match the readme. The doc's
Free/Pro split is not reflected yet; that decision is deferred.
