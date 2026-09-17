# REST API

Namespace: **`fhint/v1`** — `https://example.com/wp-json/fhint/v1`

The namespace and version are constants on `FHINT\API` (`NAMESPACE_NAME`,
`VERSION`). Reference those rather than hardcoding route strings; the helper
`fhint_rest_url( '/business' )` builds a full URL from them.

> **Status:** every route below is registered and guarded
> (`tests/Smoke/rest-routes.php`), and the routes have been exercised
> against a real WordPress and MySQL — reads, writes, validation failures,
> plan limits and capability denial — by
> `tests/Integration/database.php`. Response examples are illustrative;
> field names and codes are authoritative.

## Authentication

Every route requires a logged-in user with `manage_fhint`, which is granted
at runtime to anyone who can `manage_options`
(`FHINT\App\Core\Capabilities`). Filter it with `fhint_manage_capability`.

From the admin app, RTK Query sends the cookie and the `X-WP-Nonce` header
automatically; the nonce comes from `window.FHINT.rest_nonce`. From curl,
send both — WordPress rejects cookie auth without a nonce.

| Situation | Response |
|---|---|
| Not logged in | `401 fhint_not_logged_in` |
| Logged in, lacks the capability | `403 fhint_forbidden` |
| Cookie without a valid nonce | `401` / `403 rest_cookie_invalid_nonce` (WordPress) |

## Response envelope

Success responses are wrapped:

```json
{ "data": { }, "meta": { } }
```

`meta` is only present when there is something to report — `total`,
`exists`, `limits`, `system`. Collections return `data` as an array.

## Error shapes

There are **two**, and a client has to handle both.

**1. Domain validation** — this plugin's own rules. Machine codes per field,
which the client maps to translated strings and attaches to the right input:

```json
{
  "code": "fhint_validation_failed",
  "message": "Some of the submitted values are not valid.",
  "data": {
    "status": 400,
    "fields": {
      "name":  [ "business.name.required" ],
      "email": [ "business.email.invalid" ]
    }
  }
}
```

**2. Argument validation** — WordPress's own, from the route `args`. Ready
messages per parameter:

```json
{
  "code": "rest_invalid_param",
  "message": "Invalid parameter(s): status",
  "data": { "status": 400, "params": { "status": "status is not one of active, inactive…" } }
}
```

Codes are never translated on the server. The strings above are English
because the *message* is a fallback; the `code` is what a client keys off.

### Shared error codes

| Code | Status | When |
|---|---|---|
| `fhint_not_logged_in` | 401 | No authenticated user |
| `fhint_forbidden` | 403 | Authenticated, lacks `manage_fhint` |
| `fhint_validation_failed` | 400 | Domain rules rejected the payload |
| `fhint_business_required` | 409 | Creating a location/service before a business exists |
| `fhint_location_not_found` | 404 | Unknown location id |
| `fhint_service_not_found` | 404 | Unknown service id |
| `fhint_location_limit_reached` | 403 | Plan limit hit (Free: 1) |
| `fhint_service_limit_reached` | 403 | Plan limit hit (Free: 5) |
| `fhint_nothing_to_reorder` | 400 | No submitted id belongs to this business |
| `fhint_save_failed` | 500 | The write itself failed |

### Domain validation codes

Returned under `data.fields`, keyed by field name.

**Business** — `business.name.required`, `business.name.too_long`,
`business.legal_name.too_long`, `business.type.invalid`,
`business.category.too_long`, `business.email.invalid`,
`business.phone.invalid`, `business.website.invalid`,
`business.logo_url.invalid`, `business.price_range.too_long`,
`business.founding_date.invalid`, `social.url.invalid` (keyed
`social_profiles.<network>`).

**Location** — `location.name.required`, `location.name.too_long`,
`address.too_long`, `address.country.invalid`, `location.latitude.invalid`,
`location.longitude.invalid`, `location.email.invalid`,
`location.phone.invalid`, `location.website.invalid`,
`location.timezone.invalid`, `location.status.invalid`.

**Opening hours** — keyed by day and period so a form can attach each one:
`opening_hours.day_1.period_0.open_time`, or `opening_hours.day_2` for a
whole-day problem. Codes: `hours.day.invalid`, `hours.open_time.required`,
`hours.close_time.required`, `hours.range.zero_length`,
`hours.periods.overlap`.

**Service** — `service.name.required`, `service.name.too_long`,
`service.slug.required`, `service.slug.too_long`, `service.price.invalid`,
`service.price.negative`, `service.currency.required_with_price`,
`service.currency.invalid`, `service.url.invalid`,
`service.image_url.invalid`, `service.status.invalid`.

## Partial updates

Every write route is a **partial update**: only keys present in the body
change, and an absent key is left alone rather than cleared. This is what
lets a phone-only edit avoid wiping the rest of the profile.

To *clear* a value, send it explicitly as `""`. Two fields treat empty
specially because zero is meaningful for them:

- `latitude` / `longitude` — `""` clears to null. `0` is a real coordinate
  (Null Island is in the Gulf of Guinea) and is stored as `0`.
- `price` — `""` clears to null. `0` is a real published price, e.g. a free
  consultation, and is stored as `0`.

---

# Business

One business profile per site. It is the single source of truth for name,
phone, email, website, logo and social profiles.

### `GET /business`

Returns `data: null` with `meta.exists: false` when no profile exists — a
fresh install is a normal state, not a 404.

```json
{
  "data": {
    "id": 1,
    "name": "Testmart Ltd",
    "legal_name": "",
    "business_type": "Store",
    "primary_category": "Grocery Store",
    "secondary_categories": [ "Bakery" ],
    "description": "Neighbourhood grocery.",
    "logo_attachment_id": 0,
    "logo_url": "",
    "phone": "+880 1711-111111",
    "email": "hello@testmart.test",
    "website": "https://testmart.test",
    "price_range": "$$",
    "founding_date": "",
    "social_profiles": { "facebook": "https://facebook.com/testmart" },
    "completeness": 90,
    "created_at": "2026-09-12 09:12:03",
    "updated_at": "2026-09-12 09:14:41"
  },
  "meta": {
    "exists": true,
    "limits": { "locations": { }, "services": { } }
  }
}
```

`social_profiles` is **always an object** (`{}` when empty) so the JSON
shape never changes between states. `secondary_categories` is always an
array. `completeness` is a 0–100 weighted score used by the dashboard tile.

### `POST|PUT|PATCH /business`

Partial update; creates the profile on first save. Returns **201** the first
time and **200** thereafter.

Writable: `name`, `legal_name`, `business_type`, `primary_category`,
`secondary_categories`, `description`, `logo_attachment_id`, `logo_url`,
`phone`, `email`, `website`, `price_range`, `founding_date`,
`social_profiles`.

`business_type` must be one of the schema.org types in
`FHINT\App\Business\Business::types()` (filterable via
`fhint_business_types`). `founding_date` is `YYYY-MM-DD`.

---

# Locations

Physical places the business trades from. Free allows one
(`fhint_location_limit_reached` beyond that).

Contact fields are optional: **an empty `phone`, `email` or `website` means
"use the business value"**. `FHINT\App\Nap\Nap` resolves location first,
business second, so a single-location site enters its number once.

### `GET /locations`

Query: `status` (enum), `per_page` (0–100, `0` = all), `offset`.
`meta`: `total`, `limits`.

### `GET /locations/{id}` · `POST /locations` · `POST|PUT|PATCH /locations/{id}` · `DELETE /locations/{id}`

Writable: `name`, `address_line_1`, `address_line_2`, `city`, `region`,
`country` (ISO 3166-1 alpha-2), `postal_code`, `latitude`, `longitude`,
`phone`, `email`, `website`, `timezone` (PHP identifier), `status`,
`is_primary`, `opening_hours`.

- `status`: `active`, `inactive`, `temporarily_closed`,
  `permanently_closed`.
- Out-of-range coordinates are a `400`, never a silent discard.
- The first location created is automatically `is_primary`. Setting
  `is_primary` on another demotes the rest, so exactly one always holds it.
- Deleting the primary promotes the next remaining location, so schema
  output is never left with nothing to point at.
- `POST` returns `409 fhint_business_required` when no business exists.
- `DELETE` returns `{ "deleted": true, "previous": { } }`.

Each location also carries a read-only `formatted_address` (parts joined,
empties skipped) and an `opening_hours` object.

## Opening hours

Written **inside a location payload**, not through their own route: hours
are meaningless without the location, and a separate endpoint would let a
client save half a change.

### Reading

Grouped by day, in the site's display order (`start_of_week`):

```json
"opening_hours": {
  "days": [
    { "day_of_week": 1, "day_name": "Monday", "configured": true,
      "periods": [ { "period_index": 0, "open_time": "09:00", "close_time": "17:30",
                     "is_closed": false, "is_24h": false, "is_overnight": false } ] },
    { "day_of_week": 4, "day_name": "Thursday", "configured": false, "periods": [] }
  ],
  "has_any_hours": true,
  "period_count": 5
}
```

`days` always covers all seven. `configured: false` means the day was never
set, which is **not** the same as closed — conflating them would publish
"closed Thursday" for a business that simply hasn't filled Thursday in.
Closed is an explicit period with `is_closed: true`.

`is_overnight` marks a period whose close time is earlier than its open time
(22:00–02:00). That is one continuous shift crossing midnight, not an error
and not two periods.

### Writing

Either shape is accepted:

```json
"opening_hours": {
  "1": { "open_time": "09:00", "close_time": "17:30" },
  "2": { "is_closed": true },
  "3": { "is_24h": true },
  "5": { "periods": [ { "open_time": "09:00", "close_time": "12:00" },
                      { "open_time": "13:00", "close_time": "18:00" } ] }
}
```

```json
"opening_hours": { "periods": [
  { "day_of_week": 6, "open_time": "10:00", "close_time": "14:00" },
  { "day_of_week": 0, "is_closed": true }
] }
```

- Day numbering is `0` = Sunday … `6` = Saturday, matching PHP's `date('w')`.
- An entry's own `day_of_week` **always wins over its array index** — in a
  flat list the indexes `0` and `1` are themselves valid day numbers.
- Times accept `H:MM` as well as `HH:MM`; `9:00` is stored as `09:00:00`.
- A save **replaces the whole week**. Days omitted from the payload are left
  unconfigured. Omitting the `opening_hours` key entirely leaves existing
  hours untouched.
- Two periods on one day is a split shift. Overlapping periods are rejected
  with `hours.periods.overlap`.

---

# Services

What the business offers. Free allows five
(`fhint_service_limit_reached` beyond that).

### `GET /services` · `GET /services/{id}` · `POST /services` · `POST|PUT|PATCH /services/{id}` · `DELETE /services/{id}`

Query on the collection: `status` (`active`/`inactive`), `per_page` (0–100),
`offset`. Ordered by `sort_order`, then id.

Writable: `name`, `slug`, `description`, `image_attachment_id`,
`image_url`, `price`, `currency` (ISO 4217), `url`, `status`, `sort_order`.

- A `slug` is derived from the name when omitted, and made unique within the
  business by suffixing (`seo-consulting-2`).
- **Renaming does not change the slug** — it may already be in a published
  URL. Send `slug` explicitly to change it.
- A `price` requires a `currency`: `service.currency.required_with_price`.
- `POST` returns `409 fhint_business_required` when no business exists.

### `POST /services/reorder`

```json
{ "ids": [ 12, 9, 14 ] }
```

Send the **complete** new order; the server resequences every `sort_order`
in one transaction, so two services can never share a position. Ids not
belonging to the business are dropped; a payload containing none of them
returns `400 fhint_nothing_to_reorder`.

Responds with the full reordered collection and `meta.reordered` (how many
rows moved).

---

# Settings

### `GET /settings`

```json
{
  "data": {
    "delete_data_on_uninstall": false,
    "log_retention_days": 30,
    "schema_mode": "auto"
  },
  "meta": {
    "system": {
      "plugin_version": "0.1.0", "db_version": "0.1.0",
      "tables_total": 7, "tables_missing": [], "db_needs_install": false,
      "log_entries": 6, "php_version": "8.2.0", "wp_version": "6.8",
      "db_charset": "utf8mb4", "timezone": "+00:00"
    },
    "limits": {
      "log_retention_days": { "min": 1, "max": 365, "default": 30 },
      "locations": { }, "services": { }
    }
  }
}
```

`meta.system` is read-only and deliberately carries nothing sensitive — it
is shown in the admin and is likely to be pasted into a support thread.

### `POST|PUT|PATCH /settings`

Partial. Writable:

| Field | Type | Notes |
|---|---|---|
| `delete_data_on_uninstall` | boolean | Default **false**. Deleting the plugin to troubleshoot must not cost the operator their work, so removing data is opt-in. |
| `log_retention_days` | integer | 1–365, default 30. |
| `schema_mode` | string | `auto`, `plugin`, `seo_plugin`, `disabled`. Stored now; the schema engine that reads it is not built yet. |

Settings are stored as one option (`fhint_settings`) in grouped form
(`general`, `logs`, `schema`) and flattened for this route. **A key must
exist in `FHINT\App\Core\Settings::defaults()` before it can be persisted** —
`save()` strips anything else.

### `DELETE /logs`

Query `mode`: `expired` (default, honours the retention setting) or `all`.

```json
{ "data": { "removed": 12, "retention_days": 30, "log_entries": 1 } }
```

Clearing with `mode=all` writes one entry recording the clearance, so
`log_entries` comes back as 1 rather than 0 — the log never silently loses
the fact that it was emptied.

---

# Guided setup

### `GET /onboarding` · `POST|PUT|PATCH /onboarding`

**This route moves a position and nothing else.** The wizard saves a business
name by calling `PUT /business`, exactly as the Business screen does. There is
deliberately no write path for content here: a second one would mean a second
set of validation rules to keep in step, and it is what would let "start over"
destroy real work. `tests/Smoke/onboarding.php` asserts that the stored option
holds exactly `status, current, completed, skipped, started_at, ended_at` and
no field of business data.

`GET` returns the position plus per-step status, recomputed on every read:

```json
{
  "data": {
    "status": "in_progress",
    "current": "location",
    "completed": ["welcome", "business"],
    "skipped": [],
    "started_at": 1789242719,
    "ended_at": 0,
    "steps": [
      { "id": "welcome",  "position": 1, "is_data_step": false, "has_data": false, "completed": true,  "skipped": false, "done": true },
      { "id": "business", "position": 2, "is_data_step": true,  "has_data": true,  "completed": true,  "skipped": false, "done": true },
      { "id": "location", "position": 3, "is_data_step": true,  "has_data": false, "completed": false, "skipped": false, "done": false }
    ],
    "total_steps": 4,
    "done_steps": 1,
    "is_open": true,
    "next_step": "hours",
    "previous_step": "business"
  }
}
```

`has_data` is read from the live repositories, not from a stored flag, so a
value entered on the ordinary Business or Locations screen counts the step as
done without the wizard ever being opened. `done` is `has_data` **or** the
user walked the step — walking `hours` without setting a day is a legitimate
answer, because unset is not the same as closed (see *Opening hours*).

`total_steps` and `done_steps` count only the four data steps; `welcome` and
`done` are navigation.

The write method takes one `action`, and `step` where the action needs a
target (it defaults to `current`):

| `action` | Effect |
|---|---|
| `go` | Move to `step`. No step is marked. |
| `complete` | Mark `step` completed, move to the next step. |
| `skip` | Mark `step` skipped, move to the next step. |
| `finish` | `status` → `done`, `ended_at` set. |
| `dismiss` | `status` → `dismissed`, `ended_at` set. |
| `restart` | Position back to `welcome`, `completed`/`skipped` emptied. |

`action` is required and both fields are validated against their enums —
`step` against `FHINT\App\Onboarding\Onboarding::steps()`
(`welcome, business, location, hours, services, done`). An unknown value is a
`400` with `rest_invalid_param`.

**`restart` only rewinds the position.** It deletes no business, no location,
no hours and no services; the next `GET` will report those steps `done` again
through `has_data`, because the data is still there.

Both methods return the same state object, so a client needs no follow-up
read after a move.

---

# Dashboard

### `GET /dashboard`

**Reads stored figures and never measures.** There is no write method: the
dashboard is the most-opened screen, and anything that ran the audit from
here would put the rule set on its render. Running an audit is
`POST /audits`. The route returns ids, statuses and counts — band names,
"12 minutes ago" and "in the last 30 days" are composed in the admin bundle,
where they can be translated.

```json
{
  "data": {
    "score": {
      "has_audit": true,
      "audit_id": 12,
      "score": 86,
      "band": "good",
      "completed_at": "2026-09-16 08:48:27",
      "rules_run": 19,
      "rules_passed": 15,
      "stale": false,
      "open_findings": 4,
      "open_by_severity": { "critical": 0, "high": 0, "medium": 1, "low": 3 },
      "trend": {
        "delta": 6,
        "baseline_score": 80,
        "baseline_completed_at": "2026-08-16 09:00:00",
        "window_days": 30,
        "covers_full_window": true
      }
    }
  }
}
```

With no audit yet, `score` is `{ "has_audit": false }`.

**`open_findings` is counted from the rows, not the run's totals.** Those
totals are fixed when the audit finished; a finding since fixed or ignored
is no longer something to send the operator to.

**`stale`** is true when business data changed after the run. The card
shows the score **with a warning** — never hidden, never re-measured.

### The trend never claims more history than exists

`trend` compares the latest run with **the newest run at least
`window_days` old**. When no run is that old — a new site, or a busy one
whose history has been pruned to the last 30 runs — it compares with the
oldest run there is and sets `covers_full_window` to `false`, so the card
says "+6 since Sep 10" rather than a false "+6 in the last 30 days".

- One run is a starting point, not a trend: `delta` is `null`, never `0`.
- `0` is a real measurement — the score genuinely did not move.
- Runs are compared **for the same location only**, and ordered by when
  they finished rather than by id.

---

# SEO audit

### `GET /audits`

**Never measures.** It reads the most recent stored run; `meta.stale` says
whether that run is older than the data it describes. Running the rule set
on a GET would put every check on every render of the dashboard.

```json
{
  "data": {
    "id": 12,
    "status": "completed",
    "score": 86,
    "score_band": "good",
    "category_scores": {
      "business": { "weight": 30, "effective_weight": 30, "earned": 23.3, "percent": 78, "checks": 6, "passed": 4, "failed": 2 }
    },
    "rules_run": 19,
    "issues_total": 4,
    "issues_passed": 15,
    "triggered_by": "manual",
    "completed_at": "2026-09-13 08:48:27"
  },
  "meta": {
    "issues": [],
    "passes": [],
    "history": [],
    "stale": false,
    "bands": ["needs_work", "fair", "good", "excellent"]
  }
}
```

`meta.issues` comes back **most urgent first**, and ties keep rule order.
`meta.passes` carries the rules that passed, so "19 ran, 15 passed" is a
fact rather than a subtraction — and passes store **no severity**, which is
what keeps `issues_critical` meaningful.

### `POST /audits`

Runs the rule set and stores it, answering `201` with the same shape.
Optional `location_id`. `409 fhint_audit_no_business` when there is nothing
to audit.

### `POST|PUT|PATCH /audits/issues/{id}`

Takes `status`: `open`, `resolved` or `ignored`.

### `POST /audits/issues/{id}/fix`

Applies the finding's fix handler, marks it resolved, and **re-runs the
audit** so the score reflects the change — a fix that left a stale number
on screen would look like it did nothing. `400 fhint_fix_unavailable` when
the finding has no handler.

## How the score works

Each rule declares a **category** and a **weight within it**; categories
carry relative weights (`fhint_audit_category_weights`). The per-category
`earned` values sum to the score, so a number can always be decomposed into
where the rest went.

**A rule has three outcomes, not two.** A `skip` means it had nothing to
judge — no Google connection to compare against, no services to check — and
is removed from the denominator. Counting a skip as a pass would inflate a
score nobody earned; counting it as a failure would penalise a site for a
feature it never opted into. When a whole category skips, its weight is
**redistributed** across the categories that ran, rather than scored as
zero.

Bands: `needs_work` under 50, `fair` 50–69, `good` 70–89, `excellent` 90+.

**Severity and weight are deliberately separate.** Severity says how urgent
a finding is; weight says how much it moves the score. A missing logo is
low severity and still costs a point.

## Fixes

A fix handler runs only where **the correct value is already known** — the
stored address with `https://` in front of it, the site's own home URL, or
making the single existing location primary. Anything that would invent a
value the operator never supplied is not a fix; those stay findings with a
recommendation. With several locations and none primary the handler
refuses, rather than choosing which branch represents the business.

Filters: `fhint_audit_rules` (add or remove rules),
`fhint_audit_fix_handlers` (add fixes),
`fhint_audit_category_weights` (retune the score).

Audits also run daily on `fhint_run_audit`, and history is pruned to the
last 30 runs, their findings going with them.

---

# Schema

### `GET /schema`

Optional `location_id` (default 0, the primary location).

```json
{
  "data": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Dentist",
        "@id": "https://example.com/#localbusiness",
        "name": "Northside Dental Care",
        "telephone": "+1 512 555 0134",
        "address": { "@type": "PostalAddress", "streetAddress": "401 Congress Ave", "addressLocality": "Austin" },
        "openingHoursSpecification": [
          { "@type": "OpeningHoursSpecification", "dayOfWeek": "Monday", "opens": "09:00", "closes": "17:00" }
        ]
      }
    ]
  },
  "meta": {
    "ownership": {
      "mode": "auto",
      "modes": ["auto", "plugin", "seo_plugin", "disabled"],
      "should_publish": true,
      "detected": [],
      "conflict_certain": false,
      "conflict_possible": false,
      "deferring_to_plugin": false
    },
    "is_publishable": true,
    "blockers": [],
    "recommendations": ["schema.geo.missing"],
    "location_id": 0
  }
}
```

**Read-only, and there is no write method.** The markup is derived from the
business, its location, hours and services; the way to change it is to
change those. A route that could edit the graph directly would be a second
place where `name` lives, which the data model forbids. **Who** publishes it
is a setting, saved through `/settings` as `schema_mode`.

`data` comes from the same cache the front end prints, so the preview is
what search engines see rather than a second rendering that could diverge.

**`blockers` stop publication; `recommendations` do not.** A blocker means
nothing is printed at all — no name, an incomplete address, or a location
marked permanently closed, which schema.org has no way to express, so the
honest output is none. A recommendation is a value that is simply absent.

| Blocker | |
|---|---|
| `schema.business.missing` | No business record. |
| `schema.location.missing` | No location. |
| `schema.name.missing` | No name to publish. |
| `schema.address.incomplete` | Street, city or country missing. |
| `schema.location.permanently_closed` | Nothing is published for a closed place. |

Recommendations: `schema.phone.missing`, `schema.website.missing`,
`schema.logo.missing`, `schema.description.missing`, `schema.geo.missing`,
`schema.hours.missing`.

## Opening hours in the markup

The three-state model survives into the output, and this is the rule most
worth knowing:

- A day **nobody configured** is omitted entirely. Publishing `00:00–00:00`
  for it would tell Google the business is shut that day, which is a claim
  the plugin has no basis to make.
- A day **explicitly marked closed** *is* published as `00:00–00:00` —
  there the operator did say so.
- A **split shift** becomes two specifications for the same day.
- **24 hours** becomes `00:00–23:59`.
- A **temporarily closed** location publishes no hours at all: its stored
  hours describe normal weeks, and normal weeks are not what is happening.

Day names are the schema.org English identifiers and are never translated —
they are vocabulary, not text for a reader.

## Who publishes it

`schema_mode` decides, and `meta.ownership` explains the outcome:

| Mode | Behaviour |
|---|---|
| `auto` | Publish, unless a plugin **known** to publish LocalBusiness is active. |
| `plugin` | Always publish. |
| `seo_plugin` | Never publish; the SEO plugin owns it. |
| `disabled` | Never publish. |

Two LocalBusiness nodes on one page is a real problem — search engines pick
one and the other's claims are ignored or merged unpredictably. But *an SEO
plugin being active* does not mean it publishes this markup: Yoast only does
with its Local SEO add-on, Rank Math only when configured as a local
business. So `detected[].emits_local_business` is three-valued — `true`,
`false`, or `null` when it cannot be determined — and **`auto` stands aside
only for `true`**. A `null` never changes behaviour on its own; it is
surfaced so the operator can look at their own page source and decide.
Deferring to anything uncertain would leave many sites silently publishing
nothing, which is the worse failure because it is invisible.

Filters: `fhint_schema_graph` (add or change nodes),
`fhint_schema_detected_plugins` (correct the detection),
`fhint_schema_render` (suppress output on a particular request).

---

# Google Business Profile

Three routes and one non-REST endpoint. **The connection is not completed
over REST**, because Google redirects a browser, not an API client:
`POST /google/connect` returns a URL to send the operator to, and Google
returns them to `admin-post.php?action=fhint_google_callback`, where
`App\Google\Connection` finishes the handshake and redirects back to the
screen.

**No route here returns a token or a client secret.** The secret is
write-only and there is no route that reads one back — a route that can
return a secret is a route that publishes it to anyone who can read the
response. `tests/Smoke/google.php` asserts the serialized state contains
neither the tokens nor the secret.

### `GET /google`

```json
{
  "data": {
    "status": "connected",
    "configured": true,
    "client_id_hint": "1234567890-a…",
    "redirect_uri": "https://example.com/wp-admin/admin-post.php?action=fhint_google_callback",
    "account_email": "owner@example.com",
    "connected_at": 1789240000,
    "expires_at": 1789243600,
    "scopes": ["https://www.googleapis.com/auth/business.manage"],
    "can_manage_profile": true,
    "notice": null
  }
}
```

`status` is one of:

| Status | Meaning |
|---|---|
| `not_configured` | No OAuth client id and secret stored yet. |
| `disconnected` | A client is configured; nobody has signed in. |
| `connected` | Signed in, with permission to manage the profile. |
| `needs_reconnect` | Signed in, but `business.manage` was not granted. |

Deliberately coarse: a screen distinguishing "expired" from "revoked" would
be describing a difference the operator cannot act on differently — both
mean connect again.

`notice` carries the reason a connection attempt failed, so the screen can
explain a redirect it did not control. **It is read-once**: the server
deletes it as it hands it over, and the client must only trust it from a
read that finished after the screen opened, never from cache.

### `POST|PUT|PATCH /google/credentials`

Takes `client_id` and `client_secret`. **An empty string means "keep the
stored value"**, so the client id can be corrected without re-entering a
secret that is never sent back to be re-submitted. Returns the same state
object as `GET /google`; `400 fhint_google_credentials_incomplete` when the
result would still be missing a half.

### `POST /google/connect`

```json
{ "data": { "authorize_url": "https://accounts.google.com/o/oauth2/v2/auth?…" } }
```

`409 fhint_google_not_configured` when no client is stored. The URL carries
a single-use `state` and a PKCE `code_challenge`, both tied to a handshake
recorded server-side for ten minutes and bound to the user who started it.

### `DELETE /google`

Disconnects, returning the new state with `meta.revoked` saying whether
Google confirmed the revocation. **The local tokens are cleared either
way** — the operator asked to disconnect, and leaving a working refresh
token behind is the wrong way to fail. The stored client credentials
survive: they disconnected an account, not their Google Cloud project.

### `GET /google/profiles`

The stored copy of what Google last said, plus the mapping:

```json
{
  "data": {
    "locations": [
      {
        "id": 1,
        "name": "Downtown",
        "address": "401 Congress Ave, Austin, TX, 78701, US",
        "mapped_to": "locations/456",
        "mapped_title": "Northside Dental Care",
        "mapped_address": "401 Congress Ave, Austin, TX, 78701, US",
        "suggestions": []
      }
    ],
    "google_locations": [
      {
        "id": 3,
        "account_name": "accounts/123",
        "location_name": "locations/456",
        "fhint_location_id": 1,
        "title": "Northside Dental Care",
        "store_code": "DT-01",
        "address": "401 Congress Ave, Austin, TX, 78701, US",
        "phone": "+1 512 555 0134",
        "website": "https://example.com",
        "verification_state": "OK",
        "synced_at": "2026-09-13 01:20:00"
      }
    ],
    "synced_at": "2026-09-13 01:20:00"
  }
}
```

**This route never calls Google.** It reads `wp_fhint_google_locations`.
`synced_at` is returned so a screen can say how old the answer is — a
cached list with no date is indistinguishable from a current one.

`suggestions` are close matches for a location that is not yet mapped, best
first and at most three, each with the score that produced it. They are
candidates for a person, never applied automatically: two branches on one
street can look nearly identical, and a confident wrong mapping ends with
one branch's details published to another.

`verification_state` is derived from Google's location metadata: `OK`,
`PENDING_EDITS`, or `LIMITED`.

### `POST /google/profiles`

Reads Google and stores what comes back, then returns the same shape as the
GET with `meta.accounts` and `meta.locations` counting what was found.

A POST because it makes external requests and writes rows — doing that on
the GET the screen makes on every visit would put external HTTP on a render
path and spend the project's quota for nothing.

**A sync never changes a mapping.** It reports what Google says about a
place; which of our locations that is remains the operator's decision.

Two Google APIs are involved: Account Management for the accounts, Business
Information for the locations under each. Both must be enabled for the
Cloud project, **and Google must have approved the project** before either
returns anything — a correctly connected site otherwise looks broken.

Google reports that refusal two different ways, and they need different
answers:

| From Google | What it means | What the operator is told |
|---|---|---|
| `403 PERMISSION_DENIED` | APIs not enabled, or project not approved | Enable them, and get the project approved |
| `429` with `quota_limit_value: "0"` | No quota was ever granted — the project is not approved | Approval is a separate request; **waiting will not help** |
| `429` with any other limit | A genuine rate limit | Wait a few minutes and try again |
| `429` with no quota detail | Google did not say | Both causes, likelier one first |

**A 429 from these APIs is usually not rate limiting.** Google starts every
project at a quota of zero and lifts it on approval, so an unapproved
project's *first* request comes back as "quota exceeded". Telling that
operator to wait is advice that can never come true, which is why the limit
Google states is read rather than assumed.

### `POST /google/mapping`

Takes `location_name` (Google's resource name) and `fhint_location_id`.
One-to-one in both directions: any previous claim on either side is
released first. `404` when either side is unknown — a Google location that
is not in the last read cannot be mapped, and the message says to refresh.

### `DELETE /google/mapping`

Takes `location_name` and releases the link. Deleting one of *our*
locations releases its mapping too, through the `fhint_location_deleted`
action.

### `admin-post.php?action=fhint_google_callback`

Not a REST route. Checks the capability, claims the `state` (single use,
matched to the user who began the handshake), exchanges the code using the
stored PKCE verifier, saves the tokens, and redirects to `#/google`. Every
failure path records a `notice` and redirects rather than rendering an
error page — the operator arrives here from Google, not from a link they
chose.

---

# Plan limits

`meta.limits` entries all share one shape, from
`FHINT\App\Core\Limits::report()`:

```json
{ "limit": 1, "used": 1, "remaining": 0, "unlimited": false, "can_add": false }
```

`limit: 0` means unlimited, and `remaining` is then `null`.

Free allows **1 location** and **5 services**. Every limit check in the
plugin goes through `Limits`; raising one is a filter, not a code change:

```php
add_filter( 'fhint_limits', function ( $limits ) {
    $limits['locations'] = 5; // 0 = unlimited
    return $limits;
} );
```

---

# Adding a route

Extend `FHINT\API\AbstractController`, expose a static `init()` that hooks
`register_routes()` to `rest_api_init`, and register the controller in
`FHINT\API::init()`.

`AbstractController` supplies `permissions_check()`, the `envelope()`
helper, and the error builders used above. Pass argument definitions through
`args()`, which injects `rest_validate_request_arg` and
`rest_sanitize_request_arg` as defaults:

**WordPress silently ignores `enum`, `minimum` and `type` on an argument
that has no `validate_callback`.** Without the injected default, an
out-of-range value returns `200` and is then quietly discarded on write —
which looks like a saving bug and is very hard to trace back to the route
definition.

`tests/Smoke/rest-routes.php` asserts that every registered endpoint has a
real permission callback (never `__return_true`) and that every argument has
both callbacks, so a route missing one fails the suite rather than shipping.
