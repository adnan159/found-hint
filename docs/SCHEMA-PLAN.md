# Schema Manager — build plan

The five-tab Schema screen from the "FoundHint Schema" design, built to the
"FoundHint Schema Management — Developer Documentation" (the **doc**),
step by step. This file is the plan; tick each step's checklist as it lands
and record it in `docs/PROGRESS.md`.

Sources compared: the **design**
([`schema/schema-design.html`](schema/schema-design.html) — open it in a
browser), the **doc**
([`schema/schema-developer-doc.md`](schema/schema-developer-doc.md)), and
what this plugin already does (the **current** schema: `App\Schema\Graph`,
`Ownership`, `SchemaCache`, `Frontend\Schema`, `GET /schema`).

---

## 0. Decisions (settled 2026-10-29)

| # | Decision | Why |
|---|---|---|
| D1 | **The Schema Manager is FoundHint Pro.** Every tab, every setting, every new markup type. | Product decision. |
| D2 | **Free keeps today's LocalBusiness markup.** When Pro serves the manager, Pro's graph replaces it on every page. | It is released and promised in the WordPress.org readme; free sites must not lose it. |
| D3 | **Free shows the full five-tab screen, locked.** Real data, read-only, `PRO` tags, upgrade prompt; the preview shows the free markup. | The Free/Pro pattern in `docs/NAVIGATION.md`. |
| D4 | **The screens follow the design; the markup follows the doc.** | The design's preview has errors the doc already flags (§13). See §2. |
| D5 | **Pro is unlimited.** No service cap, no branch cap inside Pro. | Free has no manager, so the doc's "Free: 5 services" row no longer applies. |
| D6 | **Tables are created by the free plugin; all logic is Pro.** Free: table definitions, migrations, uninstall, the screens, two narrow hooks. Pro: repositories, the builder, the renderer, REST. | Agreed Free/Pro architecture (`docs/EXTENDING.md`): Pro is server-side only, all UI is in Free. |
| D7 | **Reuse the existing business, locations and services tables.** New tables hold only what schema adds: overrides, placement, providers, service areas, the page index. | The doc §3 says the same: "Schema must reference them, not duplicate them". |
| D8 | **Keep the plugin's own naming**: tables `{prefix}fhint_*`, REST `fhint-premium/v1/schema/*`, hooks `fhint_schema_*`, capability `manage_fhint`. | The doc's `foundhint_*` / `manage_options` predate this codebase's conventions. |
| D9 | **A closed day stays `opens/closes 00:00`.** | Google's LocalBusiness documentation says exactly this for "closed all day". The doc says omit the day; Google's own rule wins. Unknown days are still omitted. |
| D10 | **Google connection required for the manager** (doc §2.3). Free's baseline markup keeps working without it. | Matches Reviews and Posts. |

---

## 1. Architecture

```
Free (found-hint)                          Pro (found-hint-premium)
─────────────────                          ────────────────────
Tables (Create*Table, migrations,          Repositories for the schema tables
  uninstall)                               Provenance (reads Business/Location/
Settings keys (schema.*)                     Services/Google listing data)
Screens: src/admin/pages/schema/*          IdFactory (stable @ids)
  shell, 5 tabs, preview, save bar         Pieces: Business, Location, Service,
  locked view without Pro                    Person, WebSite, WebPage,
Hooks:                                       AboutPage, ContactPage, Breadcrumb
  fhint_schema_document  ◀──── Pro's       Context + Resolver (page → entities)
  fhint_schema_placement ◀──── renderer    Graph assembly (dedupe, ref check,
Baseline markup (unchanged)                  owners)
                                           Compat (plugin detection, owners)
                                           LiveCheck (WP-Cron)
                                           REST fhint-premium/v1/schema/*
```

**Feature keys** — the free screens show a tab's working version only when
Pro lists its key (`<ProFeature feature="…">`); each key is added in Pro's
`Features::active()` only once that step ships, so the manager can be
released tab by tab:

| Key | Unlocks |
|---|---|
| `schema.business` | Tab 01 |
| `schema.locations` | Tab 02 |
| `schema.services` | Tab 03 |
| `schema.website` | Tab 04 |
| `schema.settings` | Tab 05 |
| `schema.output` | Pro's renderer replaces the free markup on the front end |

**Two new free hooks** (added to `docs/EXTENDING.md`):

| Hook | Kind | What for |
|---|---|---|
| `fhint_schema_document` | filter `( null, $context )` | Return an array graph to print instead of the free one. `$context` = `{ post_id, url, is_front_page }`. `null` keeps the free markup. |
| `fhint_schema_placement` | filter `( 'head' )` | `head` → `wp_head`, `footer` → `wp_footer` (priority 20). |

The existing `fhint_schema_render` (print or not) and `fhint_schema_graph`
stay as they are.

---

## 2. The three sources compared

### 2.1 Where they agree (build as described)

Five tabs; form left, sticky JSON-LD preview right (none on Settings);
"From Google" provenance with Edit; placement per entity (Every page / Home
page only / Pages I choose; services: Its service page / Pages I choose);
Copy schema; Test with Google; Save and publish with a dirty state; branch
selector; service list with status toggles and "to check" badges; service
editor in five sections; website structure rows; output on/off, head or
footer, live check, what goes where, SEO plugin rows with fix steps.

### 2.2 Where the design and the doc differ — what we build

| # | Topic | Design | Doc | Build |
|---|---|---|---|---|
| 1 | Script tags | Four (`foundhint-business`, `-location`, `-services`, `-website`) | One `@graph` | **One** `<script type="application/ld+json" id="fhint-schema">`. The Settings "What gets added" panel shows one tag. |
| 2 | Branch parent | `parentOrganization` → `#organization` (doesn't exist) | → `#business` unless an Organization exists | **Doc** |
| 3 | Sister branches | Published as `isRelatedTo` | Display only | **Doc** — `isRelatedTo` is not a LocalBusiness property. Chips stay in the UI. |
| 4 | Service `@id` | `{page}#service` | `{page}#service-{slug}` | **Doc** |
| 5 | About/Contact nodes | No `@id`, not linked | Same `@id` as the page's WebPage, `isPartOf` → `#website` | **Doc** — AboutPage/ContactPage *replace* WebPage on that page. |
| 6 | WebSite publisher | → `#organization` | → `#business` when no Organization | **Doc** (13.8) |
| 7 | Home WebPage | No `about` | `about` → `#business` | **Doc** (13.9) |
| 8 | Branch fields | No Region, no Map URL (but JSON has `hasMap`) | Add both | **Add both** (13.6) |
| 9 | Field caption | `gbp.title` only | Also the Schema.org property | **Both**: `gbp.title · name` (13.16) |
| 10 | Override wording | "Edit" → "Edited here", "Use Google's value" | "Reset to Google" | **Design's wording** |
| 11 | Header | "Synced from Google 2 hours ago" + Refresh | Connection pill, Connect, Upgrade | **Design's header** when connected; the doc's connect screen when not; "Upgrade to Pro" only without Pro |
| 12 | Plan limits | None shown | Free 5 services, etc. | **None** (D5). Free sees everything locked. |
| 13 | Medical specialty list | Includes PrimaryCare, Physiotherapy, Dermatology for a dentist | Enum from `MedicalSpecialty` | Values from `schema_types.json` per type |
| 14 | Schema.org validator link | — | Optional second link | **Add** "Check with Schema.org" beside Test with Google |

### 2.3 Where the doc and the current plugin differ

| Topic | Current | Build |
|---|---|---|
| `@id`s | `#localbusiness`, `#localbusiness-{id}`, `#services` | Pro uses the doc's ids (`#business`, `{branch page}#location`, `#service-{slug}`, `#website`, `{url}#webpage`, `{url}#breadcrumb`). Free keeps its ids — the free and Pro graphs are never on one page. |
| Closed day | `00:00–00:00` | Keep (D9) |
| Holiday hours | Stored, not published | Pro publishes them (validFrom/validThrough, next 90 days) |
| Photos | Logo only | Pro: up to 3 listing photos as `image[]` (user picks) |
| Map link | Not published | Pro: `hasMap` from the listing's `cid` |
| Placement | Every location on every page | Pro: per-entity placement |
| Ownership | One mode for LocalBusiness | Pro: an owner per type (`schema.owners`) |
| Detection | Yoast, Rank Math, AIOSEO, SEOPress | Pro adds WooCommerce, The SEO Framework, Schema Pro, and theme output found by the live check |
| Skipped requests | Feeds, embeds | Pro's renderer also skips 404, password-protected, noindex, non-public |

---

## 3. Data model (free plugin creates; Pro reads and writes)

DB version **0.19.0**. All four tables follow the dbDelta rules in
`CLAUDE.md`; each `Create*Table` docblock documents every column.

### `{prefix}fhint_schema_entities` — one row per thing schema describes

| Column | Meaning |
|---|---|
| `id` | PK |
| `entity_kind` | `business` · `location` · `service` |
| `entity_id` | Row id in `fhint_business` / `fhint_locations` / `fhint_services` |
| `schema_kind` | Business only: `localbusiness` · `organization` |
| `schema_type` | Schema.org type, e.g. `Dentist`; '' = derive from the Google category |
| `overrides` | JSON `{ field: value }` — values typed on the Schema screen ("Edited here") |
| `google_seen` | JSON `{ field: value }` — the Google value when each override was made; a later difference shows "Your website and Google disagree" |
| `extras` | JSON — type extras (`isAcceptingNewPatients`, `medicalSpecialty`, `servesCuisine`…), service extras (`serviceType`, `person_name`, `person_type`, `pricing` `{model, min, max, currency}`, `page_id`, `image`), business `images[]` picks |
| `status` | `draft` · `active` · `inactive` — only `active` prints |
| `schema_id` | The `@id` as first built; rewritten only when its URL changes |
| `placement` | `every_page` · `home_only` · `chosen` · `own_page` |
| `post_ids` | JSON array — pages for `chosen` |
| `sort_order` | Services: list order = output order |
| `created_at`, `updated_at` | UTC |

`UNIQUE KEY entity (entity_kind, entity_id)`, `KEY status`, `KEY placement`.
No row = defaults (derived type, no overrides, active, default placement).

### `{prefix}fhint_schema_service_providers`

`id`, `service_id`, `provider_kind` (`business` · `location`), `provider_id`,
`sort_order`. One or more rows per service.

### `{prefix}fhint_schema_service_areas`

`id`, `service_id`, `location_id` (0 = every provider), `name`,
`area_type` (`Place` · `City` · `AdministrativeArea` · `Country`),
`source` (`google` · `manual`), `sort_order`.

### `{prefix}fhint_schema_page_index` — resolved placement, for the front end

`id`, `post_id`, `entity_kind`, `entity_id`. Rebuilt by Pro on every save for
`chosen` / `own_page` entities, so a page request does one indexed lookup.
`every_page` / `home_only` entities need no rows.

### Settings keys (`App\Core\Settings::defaults()`, preferences only)

```php
'schema' => array(
	'mode'      => 'auto',            // existing
	'enabled'   => true,              // Settings tab master toggle ("Add to my site header")
	'tabs'      => array(             // each schema tab's switch (website: website.enabled)
		'organization' => false, 'localbusiness' => true, 'locations' => true, 'services' => true,
	),
	'placement' => 'head',            // head | footer
	'owners'    => array(),           // { Type: 'fhint' | '<plugin key>' }
	'website'   => array( 'enabled' => true, 'name' => '', 'alternate_name' => '' ),
	'webpage'   => array( 'enabled' => true ),
	'about'     => array( 'enabled' => false, 'post_id' => 0 ),
	'contact'   => array( 'enabled' => false, 'post_id' => 0 ),
	'breadcrumbs' => array( 'enabled' => false ),
),
```

Live-check results and the built output are caches, not preferences:
Premium keeps them in transients (`fhintpremium_live_check`, and
`fhintpremium_schema_site_*` keyed by the data stamp and the
`fhintpremium_schema_version` counter).

Per-entity choices that are not preferences live on the settings rows'
`extras`: the business row's `main` (main business, head office, whether
customers visit) and `found_dismissed`; each location's `role`,
`role_confirmed`, `parent`, `inherit`.

**Uninstall** drops the four tables with the others; Pro's uninstall never
touches them (they belong to Free).

---

## 4. Shared screen pieces (built in Step 1, reused by every tab)

All in `src/admin/pages/schema/`:

| Piece | From the design |
|---|---|
| `SchemaShell` | Header ("Synced from Google {ago}" + Refresh from Google → existing `POST /profile/google/refresh`), the six-tab bar with live summaries and an on/off switch on each schema tab, unsaved-changes guard ("Save, discard, or stay") |
| `FieldRow` | Label, badges (Required by Google / …for a storefront / Recommended / Optional / From Google / Edited here), Edit ↔ Use Google's value, caption `gbp.path · property`, disagreement note. Long badges and captions wrap inside narrow (three-column) rows |
| `JsonPreview` | Live dot, `@type` chip, property count, syntax-coloured JSON from the **server** (`POST …/schema/preview`, debounced 400 ms), Copy schema, Test with Google, Check with Schema.org, "Save first to test the live page", "copy and paste into the Code tab" tip on a non-public site. `outputsOn` adds the "Outputs on: /page/" line (branches); `className` lets a tab place it in its own grid (Services: beside the list and the form) |
| `PlacementCards` | Every page (with page count) / Home page only / Pages I choose + page chips; service variant |
| `PageChips` / `PagePicker` | Searchable published pages with "Used by …" |
| `SaveBar` | Saved and live / unsaved changes / saving |
| `ProLock` | The locked state: inputs read-only, PRO tags, upgrade prompt; preview shows `GET /schema` (free markup) |
| `ConnectScreen` | "Connect your Google Business Profile to set up schema" + Connect Google |
| `schemaApi.js` | Pro endpoints via absolute URLs (`proRestUrl()`), like `proApi.js` |
| Location pills (`lib/locations.js`) | `BADGE`, `TONES`, `DOTS`: the design's rounded pills for role, output status and warnings, also used by Settings' status tags |
| Two-column layout | Form left, sticky preview right. Locations and Business use a wrapping flex row; Services is a container-query grid (list above the form, preview beside both, `ServiceEditor`'s wrapper is `display: contents`) so the list is never remounted when switching services |

---

## 5. Steps

Tab numbers in Steps 0–3 are the original five-tab ones. The screen now has
six: 01 Organization, 02 LocalBusiness (main business), 03 Locations, 04
Services, 05 Website structure, 06 Settings (see "Two business tabs" below).

Each step ends the same way: Free + Pro PHPCS clean; Pro smoke suite and a
Pro database suite (new: `found-hint-premium/tests/Integration/schema.php`,
own tables, cleans up after itself) mutation-tested; the real bundle checked
in the browser against a mocked API, with Pro on and off; output pasted into
Google's Rich Results Test (Code tab) and the Schema.org validator;
`docs/PROGRESS.md`, `includes/API/README.md` (free) and Pro's `CLAUDE.md`
updated; the feature key added to `Features::active()`.

### Step 0 — Groundwork — done 2026-10-29

**Free**
- [x] The four tables, `Tables` keys, `Database::create_tables()`, uninstall list, schema-format test count, DB 0.19.0.
- [x] `schema.*` settings defaults.
- [x] `fhint_schema_document` and `fhint_schema_placement` in `Frontend\Schema`; smoke tests (a returned array replaces the free graph; `null` keeps it; footer placement).
- [x] `EXTENDING.md`: the hooks and the six feature keys.

**Pro**
- [x] `FHINTPREMIUM\App\Schema\` skeleton; `IdFactory` (doc §2.2, fallback `#location-{code|id}`, slugged service ids), `Context::from_query()`, `Graph` (drop empties, dedupe by `@id`, every `{ "@id" }` resolves or is dropped, owner filtering), `Renderer` on `fhint_schema_document`.
- [ ] `FHINTPREMIUM_MIN_FREE_VERSION` → the free release carrying Step 0 (set when 1.2.0 is tagged).

**Done when** Pro returns an empty graph for a page and the free markup stays; ids are stable across rebuilds; a dangling reference never prints.

### Step 1 — Business schema (tab 01) — done 2026-10-29

**Free UI**: the shared pieces (§4) and tab 01 exactly as designed — Schema
type cards, Business subtype select (friendly label + type chip, "Matched
from your Google category"), eligibility banner ("Has the details Google
needs for a local business result"), fields counter, Business information,
Address (storefront vs service area), Hours and reach (hours read-only from
Google), Details for {type}, Add business schema to.

**Pro**
- [x] `schema_types.json` — curated local types, each with its parent, Google-category matches and extras (Dentist: `isAcceptingNewPatients`, `medicalSpecialty`; Restaurant: `servesCuisine`, `menu`, `acceptsReservations`; …); filter `fhint_schema_types`.
- [x] `Provenance` (`BusinessFields`) — each field's Google value from the business/primary location (already Google-synced) and its `gbp.*` path; overrides layered on top; `google_seen` comparison.
- [x] `Pieces\Business` — doc §5 fields; `image[]` from chosen photos (now Media Library only — see QA fixes); `hasMap` from `cid`; special hours (next 90 days); type extras; Organization hides address/hours.
- [x] Single-location rule: one business node, no Organization; `#organization` only for Organization or a parent with branches.
- [x] REST: `GET/PUT schema/business` (`draft` flag), `POST schema/preview`, `GET schema/pages`, `GET schema/state` (summaries for the tab bar, sync time, connection).
- [x] Validation on save (doc §11.2): URL, phone, email, coordinates, price range; missing required fields keep it `draft`.

**Done when** every field in the design round-trips; Edit → Edited here → Use Google's value works; a Google refresh updates un-edited fields only; the preview equals what the page prints.

### Step 2 — Location schema (tab 02) — done 2026-10-29

**Free UI**: branch pills ("On {n} pages", "Off"), branch fields incl.
**Region** and **Map URL** (§2.2 #8), Part of, sister-branch chips, hours
read-only, "Add {branch} location schema to" (default Pages I choose: the
branch's own page + Contact). One location → selector hidden, location =
the business.

**Pro**
- [x] `Pieces\Location` — subtype of the business, `branchCode` from the listing's store code, own contacts, `url` = the linked page (`locations.wordpress_post_id`) else website, `hasMap`, hours + special hours, `parentOrganization` per §2.2 #2; shared fields inherited at render time.
- [x] Warning: a branch on Every page in a multi-branch setup.
- [x] REST: `GET schema/locations`, `GET/PUT schema/locations/{id}`.

**Done when** each branch has its own `@id`, address, geo, hours; deactivating keeps the data and stops output; unknown hours are never published.

### Step 3 — Service schema (tab 03) — done 2026-10-29

**Free UI**: list (From Google badge, "to check" badge with its message on
hover/expand, meta line, status toggle that saves at once, drag to reorder,
+ Add a service); editor sections 01 Service, 02 Service provider (main
business or one or more branches; specific provider Person / Partner
company), 03 Service areas (chips, type select, Google suggestions), 04
Service page (WordPress page / URL, "Used by …", page warnings), 05 Optional
details (No price / Fixed / Starting at / Range, currency default from the
business country), Add this schema to.

**Pro**
- [x] `Pieces\Service` — `provider` → business/branch `@id`s; `Person` node with `worksFor` (a partner company joins the providers instead); `areaServed` typed places; `offers` per pricing model; `url` + `@id` from the service page (a page on another host never lends its address).
- [x] Page warnings (doc §7.2): no page, general page, page shared (`page_shared`), not published, other host, not canonical; plus no pages chosen and a provider branch switched off.
- [x] Service categories per business type (in `schema_types.json`).
- [x] REST: `GET/POST schema/services` (`list` = 0 or a branch id), `GET schema/services/blank`, `GET/PUT/PATCH/DELETE schema/services/{id}`, `PUT schema/services/order`, `preview` with `entity: service`. Services stay in `fhint_services` (name, description, image, price, currency, url, status, order); schema extras go to `fhint_schema_entities` / providers / areas.
- [x] The tab follows the top-bar location: the main location shows the business's list, a branch its own (provided by that branch by default).
- [x] Free: deleting a service anywhere also clears its schema settings, providers and areas.

**Done when** two services on one page get distinct `@id`s and a warning; offers match the pricing model; no service creates a business node.

### QA fixes — Organization schema (report of 2026-10-29) — done 2026-11-01

The QA report (`FoundHint Organization Schema — QA Test Report`, 8 defects)
tested the Business tab set to Organization. Fixed in the Business tab:

- [x] **D1 logo** — chosen from the Media Library; printed as an `ImageObject` at `{home}#logo` with width and height; default the theme's custom logo, else the site icon; nothing printed without one.
- [x] **D2 phone** — printed in international form (`Phone::international()`: the country's calling code, its trunk prefix dropped; `+880-1518-984873`). A typed number that cannot be converted is refused (`*.telephone.not_international`); the field shows "Printed as …". Branches and the contact point too.
- [x] **D3 avatar** — Google account pictures (`/a/`, `/a-/`) are never offered or printed.
- [x] **D4 hotlinking** — logo and photos must be on this site (`*.external`); Google photos are imported to the Media Library first (`POST schema/media/import`, only photos the listing has, deduplicated by source); a Google address saved before is dropped from the output.
- [x] **D5 isolated entity** — the business preview is a `@graph` with a `WebSite` (`Pieces\WebSite`, `{home}#website`) whose `publisher` points at `#organization` / `#business`; switched off by `schema.website.enabled`. Part of Step 4 brought forward.
- [x] **D6 missing fields** — groups "About the business" (legal name, alternate name, email, founding date, founder, knowsAbout) and "Contact point" (type, phone, email, languages); an Organization may print an address and areas served. Legal name, email and founding date start from the business record. Each prints only when filled.
- [x] **D7 sameAs** — links tidied (tracking parameters and fragments removed), one entry per profile, at most 20; the field lists the platforms found and suggests common missing ones.
- [x] **D8 description** — live count against 150–300 characters and a warning for a two-word phrase used 3+ times (guidance only; 750 stays the hard limit).
- [x] The document finaliser keeps references to nested entities (`image: { "@id": "#logo" }`).

**Still open from the report**
- [ ] SoftwareApplication node (it describes FoundHint itself) — decide: a general opt-in section, or foundhint.com only (Q4).
- [x] The live site prints these — Step 5's renderer shipped (`schema.output`, done 2026-11-01).
- [ ] Duplicate Organization with Yoast / Rank Math (WP-009) — Step 5's compat work.
- [ ] The report's 43 manual tests in a real admin (saving, security, caching, theme switch, multisite).

### Two business tabs and tab switches — done 2026-11-01

The Business tab is split into **01 Organization schema** (the brand,
`#organization`) and **02 LocalBusiness schema** (the place, `#business`);
the tabs after them move up one number. Every schema tab has an on/off
switch in the tab bar.

- [x] Each business tab keeps its own settings row (`entity_kind`
  `organization` / `business`); both start from the same stored records. The
  kind picker is gone — the tab is the kind (`?kind=` on `schema/business`,
  `entity: organization` on preview).
- [x] A row saved as Organization before the split moves to the
  Organization tab once, on first read (Organization on, LocalBusiness off).
- [x] The Organization has no photos field (its image is the logo); the
  LocalBusiness, Location and Service keep theirs.
- [x] With both on, the LocalBusiness has `parentOrganization` →
  `#organization`; the website's publisher is the Organization when it is
  on, else the LocalBusiness, else nobody.
- [x] Switches (`Tabs`, `PUT schema/tabs`): `schema.tabs.{organization,
  localbusiness, locations, services}` and the existing
  `schema.website.enabled`. Off keeps the details, prints and links nothing;
  the tab's form is replaced by an off panel ("… schema is off", what turning
  it on does, "Turn on … schema"). Switching off the open tab with unsaved
  changes asks Save / Discard / Stay first. The Organization starts off. Settings has no switch.
- [x] URLs: `#/schema?tab=organization`; LocalBusiness is the default and an
  old `?tab=business` link opens it. The renderer (Step 5) must honour the
  switches.

### Design update (FoundHint Schema (1).html) — done 2026-11-02

Built in order A → B → C → D (the 6-tab bar stays, by decision).

**A. Choose your main business — done 2026-11-01**
- [x] With more than one location and no choice yet, the Main business tab asks first: each Google profile (area, ★ rating, "Suggested" when its website is this site), or "My head office isn't on Google — enter details manually" (name required, address, website).
- [x] A location chosen becomes the primary location across FoundHint; a head office typed here describes the LocalBusiness from those details (nothing from a listing it is not) and every location becomes a branch. Saved in the business row's `extras.main`; `GET/PUT schema/main` (`mode`: location | manual | ask).
- [ ] "Your main business is a head office" status — with the setup wizard (B).

**B. Locations — done 2026-11-02**
- [x] Roles per profile (`LocationRoles`, `extras.role` / `role_confirmed`): main, branch, separate (its own website — nothing published here), removed. An unconfirmed profile works as a branch, as before; only branches are branches (`LocationSchema::branches()`).
- [x] The list: summary, every profile with role, assigned page, output status (Live, Needs a page, Blocked, Paused, Not on this site), issues (no or unpublished page, shared page, missing details — blocking; other domain, duplicate phone or address — warning; missing map pin or hours — recommended) and actions (Edit, Assign/Change page, Open tab 02, Open; menu: Pause/Resume output, Re-sync from Google, Remove from schema). One location: "Your main business schema covers it" with "Add another location" steps.
- [x] "N more Google profiles found": Generate branch schema / Not now (hidden until another is found).
- [x] Location setup, 3 steps: main business (or a head office typed by hand), do customers visit it (no → Organization on, LocalBusiness off), a role for each other profile with FoundHint's suggestion (another domain → Separate).
- [x] Branch editor: All locations breadcrumb, role and status tags, alerts, 01 Location page (an existing page, saved at once; "used by …"), 02 Schema type (own subtype, never Organization), 03 Parent business (Organization 01, Main business 02, or none), 04 Inherit from brand (logo, social profiles, price range). Existing fields, print switch, branch pills and placement stay.
- [x] Separate business: its own LocalBusiness schema at its website's `#business`, to copy there, or "Treat as a branch anyway".
- [x] Routes: `GET schema/locations/roster`, `POST schema/locations/setup`, `POST schema/locations/found`, `PUT schema/locations/{id}/role`, `PUT schema/locations/{id}/page`, `GET schema/locations/{id}/separate`. Free: `LocationRepository` writes `wordpress_post_id`.
- [ ] "Create location page" — in the design's data but not its markup; not built.
**C. Settings and site output — done 2026-11-02** (Step 5's core; the 6-tab bar kept, so the website rows are tab 05)
- [x] Output live: `schema.output`, `schema.website`, `schema.settings` in `Features::active()`. `Output` builds the entities once (cached, invalidated by every schema save, settings save, `save_post`, `deleted_post`, theme switch and the data stamp) and gives each request its page's nodes as one `@graph` in `<script id="fhint-schema">`.
- [x] What prints: a switched-on tab, an active entity (no drafts, paused branches or inactive services), on its placement; business types only while "Who publishes it" allows; WebSite / WebPage / BreadcrumbList only while FoundHint owns them. References to entities printed on other pages are kept.
- [x] 05 Website structure: WebSite (home), WebPage (every page), AboutPage / ContactPage on their page (suggested by slug), BreadcrumbList (page parents, a post's category); `GET/PUT schema/website`.
- [x] 06 Settings: Add to my site header (off → nothing prints, free markup included), Where in the page (head / footer), Check my site (fetches the home page, compares types: missing, duplicates by another plugin), What gets added, What goes where (`GET schema/page-map`), Works with your SEO plugin (Yoast, Rank Math, AIOSEO, SEOPress, Slim SEO, The SEO Framework, WooCommerce; Yoast Local fix steps). "Who publishes it" kept. `GET/PUT schema/settings`, `POST schema/live-check`.
- [ ] Live check on save and daily (WP-Cron) — on demand only for now.
**D. Preview — done 2026-11-02**
- [x] "Outputs on:" under the branch editor's preview: the branch's page, or "no page yet. Assign one to publish." (also: not published yet, shared page).
- [x] A branch's images are its own (its Google photos imported into the Media Library), never the brand's — the design's "Always from this location's Google profile".

**Design match — done 2026-11-01** (PROGRESS step 71)
- [x] Locations list and branch editor styled to the design (summary bar, found banner, table, pills, legend; fields in three columns). Location setup kept.
- [x] Services: list above the form, preview beside both.
- [x] Settings: the design's status pills.

### Step 4 — Website structure (tab 05) — done 2026-11-02

**Free UI**: the five rows — toggle, type chip, description, "Added to"
(page select for About and Contact, auto-detected by slug and confirmed by
the user).

**Pro**
- [x] `Pieces\WebSite` on the home page only; `publisher` → `#organization` when it is on, else `#business`; no SearchAction.
- [x] `Pieces\WebPage` — `isPartOf`, `about`, `primaryImageOfPage`, `breadcrumb`, dates; AboutPage/ContactPage replacing WebPage on their page; the trail (`WebPage::breadcrumb`) from page parents, a post's category.
- [ ] SEO-plugin title/description in WebPage — uses the WordPress title and excerpt for now.
- [x] An About/Contact row switched on needs a published page (`schema.website.page.required` / `.invalid`); suggested by slug until saved.
- [x] REST: `GET/PUT schema/website`.

**Done when** the home page carries WebSite + WebPage(`about` → business); breadcrumb positions follow the real hierarchy.

### Step 5 — Settings (tab 06) and output — done 2026-11-02 (open items below)

**Free UI**: Add to my site header (On/Off), Where in the page, live status
box + Check my site, What gets added (one tag), What goes where (chips with
the real subtype; amber for a page with two conflicting entities; click →
tab or page JSON), Works with your SEO plugin (rows, status chips, fix
panel, "I've switched it off, check again").

**Pro**
- [x] `GET schema/page-map` — built from `Output` (cached entities + their placement) rather than a `fhint_schema_page_index` table; the table stays unused for now.
- [ ] Amber in What goes where for a page with two conflicting entities; click a row to open its tab.
- [x] SEO plugins (`SiteSettings::plugins()` on the free plugin's `Ownership::detected()`): Yoast (Local → duplicate, core → overlaps on website/page), Rank Math, AIOSEO, SEOPress, Slim SEO, The SEO Framework, WooCommerce; Yoast's fix steps; owner per type in `schema.owners` respected by the output.
- [ ] Schema Pro detection; "Integrate" (switching another plugin's output off through its filters).
- [x] `LiveCheck` — fetches the home page (own host, 10 s, no cookies), parses every JSON-LD block, compares expected vs found (missing; duplicates printed by another plugin); on demand, never on a front-end request.
- [ ] Check one page per page-map row too; run on save and daily via WP-Cron.
- [x] `Renderer` — per-request graph, one script tag, head or footer (see "C. Settings and site output"). Still to do: purging known page caches.
- [x] Add `schema.output` to `Features::active()` — Premium's graph now replaces the free one.
- [x] REST: `GET/PUT schema/settings` (plugins included — no separate `schema/compat`), `POST schema/live-check` (synchronous — no job route).

**Done when** exactly one FoundHint script per page; output off removes only ours; the owner choice is respected; turning Pro off brings the free markup back.

### Step 6 — QA and release

- [ ] The doc's test matrix (§14.3) on the dev site, each SEO plugin on and off.
- [ ] Rich Results Test and Schema.org validator on a public test page.
- [ ] `</script><script>alert(1)</script>` in every text field renders harmlessly.
- [ ] Zero extra queries per page on a warm object cache; works behind page caching.
- [ ] Readme: Free section unchanged; Pro section describes the manager.
- [ ] Rename the Schema screen's remaining "Pro" copy to "Premium" — user-facing strings in `SaveBar` ("FoundHint Pro's full schema output") and `SchemaHeader` ("part of FoundHint Pro").
- [ ] Free release (tables + screens + hooks) **before** the Pro release that needs them.

---

## 6. Order of work and releases

1. Step 0 → Free 1.2.0 (tables, hooks, locked screens can follow in the same release).
2. Steps 1–2 → Pro (Business and Location tabs live; output still free until Step 5).
3. Steps 3–4 → Pro.
4. Step 5 → Pro switches the front end to the full graph.
5. Step 6 → both released.

The locked free screens (D3) can be built alongside Step 1 and shipped with
the first free release, so free users see the manager from day one.

---

## 7. Open questions

| # | Question | Default if not answered |
|---|---|---|
| Q1 | Business images: hotlink Google's photo URLs, or import them to the Media Library (doc 13.4)? | **Settled 2026-11-01 (QA D4):** import — schema images are always served from this site. |
| Q2 | Pro licensing/updates are not built yet. Ship the Schema Manager before them? | Build the features; licensing is a separate track. |
| Q3 | Free release number for Step 0. | 1.2.0 |
| Q4 | SoftwareApplication (QA report): a general opt-in section for software businesses, or only foundhint.com's own markup? | Not built until decided. |
