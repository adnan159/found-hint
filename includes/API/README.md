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
| `fhint_google_required` | 409 | A write to the business details with no Google account linked |

**The business details need a linked Google account.** Every route that
changes them — `/business`, `/locations`, `/services`, `PATCH /profile` and
the `/profile/media`, `/profile/listing`, `/profile/google/refresh` and
`/profile/publish/*` routes — answers `409 fhint_google_required` while no
Google account is linked. Reads still answer; `GET /profile` then returns
every section in its usual shape with the values emptied (see below).
"Needs reconnect" counts as linked.

### Domain validation codes

Returned under `data.fields`, keyed by field name.

**Business** — `business.name.required`, `business.name.too_long`,
`business.legal_name.too_long`, `business.type.invalid`,
`business.category.too_long`, `business.category_id.unknown`,
`business.categories.unknown`, `business.categories.too_many`,
`business.categories.includes_primary`, `business.description.too_long`,
`business.description.has_link`, `business.email.invalid`,
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

### Categories on a business

A category is stored as **Google's id with Google's name beside it**, because
the id is what a push to Google sends. Pick ids from
[`GET /google/categories`](#get-googlecategories).

```json
{
  "primary_category_id": "gcid:dentist",
  "secondary_categories": ["gcid:dental_clinic", "gcid:cosmetic_dentist"]
}
```

is stored, and returned, as:

```json
{
  "primary_category_id": "gcid:dentist",
  "primary_category": "Dentist",
  "secondary_categories": [
    { "id": "gcid:dental_clinic", "name": "Dental clinic" },
    { "id": "gcid:cosmetic_dentist", "name": "Cosmetic dentist" }
  ]
}
```

- **The name always comes from the list, never from the request.** Sending
  `primary_category` alongside an id is ignored in favour of Google's wording.
- `secondary_categories` accepts ids, exact names, or `{ id, name }` objects,
  as a list or a comma-separated string. Repeats are removed.
- Sending **only** `primary_category` (the plain text field) still works: a
  name Google uses is tied to its id, and a freehand one is kept with
  `primary_category_id` cleared, so a stale id never survives a rename.
- Refused with `400`: an id Google does not have
  (`business.category_id.unknown` on `primary_category_id`); on
  `secondary_categories`, an entry not on the list
  (`business.categories.unknown`), more than 9
  (`business.categories.too_many`), or the primary category repeated
  (`business.categories.includes_primary`).

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

Optional `location_id` (default 0, the primary location): the score card for
that location's latest audit, with `meta.location_id`. A named location shows
only its own runs (`has_audit: false` if it has none); the primary location
falls back to the latest run of any location. `404` for a location that does
not exist.

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

Optional `location_id` (default 0, the primary location): the latest run and
the history **for that location only**. `meta.location_id` is the location
the answer is for. Runs recorded before the site had a location (location 0)
count as the primary location's. `404` for a location that does not exist.
`GET /dashboard` takes the same `location_id`.

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

## Profile

The Business Profile screen as one document: **read whole, saved a section
at a time**. It owns no rules of its own — each section delegates to the
entity that already validates and stores that data, so a value saved here and
the same value saved through `/business`, `/locations` or `/services` pass
through one set of rules.

**Saving stores to this site only.** Nothing on this route contacts Google.

**With no Google account linked** (`meta.google.linked: false`) every section
comes back **empty but whole** — the form's structure stays (`social.networks`,
`attributes.definitions`, `services.limits`), the values do not, and
`meta.reviews` is `null`. Stored data is not deleted and reappears as soon
as an account is linked; saving answers `409 fhint_google_required`.

### `GET /profile`

Seven sections under `data`, in screen order: `info`, `address`, `hours`,
`social`, `attributes`, `services`, `media`.

```json
{
  "data": {
    "info": {
      "name": "Northside Dental Care",
      "primary_category": "Dentist",
      "primary_category_id": "gcid:dentist",
      "secondary_categories": [{ "id": "gcid:dental_clinic", "name": "Dental clinic" }],
      "description": "…",
      "website": "https://…",
      "phone": "+1 512 555 0134",
      "cid": "",
      "history": [{ "id": 2, "description": "…", "source": "user", "created_at": "2026-10-11 09:00:00" }]
    },
    "address": {
      "location_id": 1, "address_line_1": "410 Congress Ave", "address_line_2": "",
      "city": "Austin", "region": "TX", "postal_code": "78701", "country": "US",
      "latitude": 30.2849, "longitude": -97.7341,
      "formatted": "…", "locked": false
    },
    "hours": {
      "location_id": 1, "timezone": "America/Chicago",
      "opening_hours": { "days": [], "has_any_hours": true, "period_count": 6 },
      "special_hours": [
        { "date": "2026-12-25", "is_closed": true, "is_24h": false, "note": "Christmas Day", "periods": [] }
      ]
    },
    "social": {
      "social_profiles": { "facebook": "https://facebook.com/…", "instagram": "" },
      "networks": ["facebook", "instagram", "x", "linkedin", "youtube", "tiktok", "pinterest", "yelp"],
      "same_as": ["https://facebook.com/…"]
    },
    "attributes": { "location_id": 1, "values": [], "definitions": [] },
    "services": { "items": [], "limits": {}, "google_types": [] },
    "media": { "logo": null, "cover": null, "gallery": [], "pending": [], "location_id": 1, "count": 0 }
  },
  "meta": {
    "exists": true,
    "google": {
      "status": "disconnected", "connected": false, "mapped": false,
      "location": "", "account": "", "title": "", "verified": false, "synced_at": null
    },
    "limits": { "description": 750, "additional_categories": 9 }
  }
}
```

- `hours.opening_hours` is the same shape `/locations` returns.
- `info.cid` and `address.locked` depend on the location being mapped to a
  Google listing (`meta.google.mapped`).
- `attributes.definitions`, `services.google_types` are empty until Google's
  reference lists are fetched; `media` is empty until photos are built.

### `POST | PUT | PATCH /profile`

```json
{ "section": "info", "fields": { "description": "New wording." } }
```

`section` is required and must be one of the seven. `fields` is that
section's fields; **a key that is absent is left alone**. The response is the
section as it now reads, with the same `meta` as the `GET` plus
`meta.section`, so the screen does not need to refetch.

Errors: `400 fhint_validation_failed` with `data.fields` keyed per field;
`409 fhint_business_required` when a section needs a business that does not
exist yet; `401`/`403` as everywhere.

| Section | Fields | Notes |
|---|---|---|
| `info` | `name`, `primary_category_id`, `primary_category`, `secondary_categories`, `description`, `website`, `phone`, `additional_phones` (up to 2, whole list; `business.additional_phones.too_many`, per box `additional_phones.N`: `business.phone.invalid`, `business.additional_phones.same_as_main`), `opening_date` (`YYYY-MM`, `""` clears; `opening_date.invalid`, `opening_date.too_far` past one year ahead) | The `/business` rules, including [categories](#categories-on-a-business). Any other key is ignored. A changed description is added to `history`; saving the same words again is not. Optional `description_source`: `user` (default), `ai`, `google`. |
| `address` | `address_line_1`, `address_line_2`, `city`, `region`, `postal_code`, `country`, `latitude`, `longitude` | Creates the primary location if the business has none. **`409 fhint_address_locked` once the location is mapped to a Google listing** — the address is then Google's. Also `service_area`: the whole list of places served, at most 20, each `{ name, place_id }` or a plain name (a typed place, `place_id` empty — kept and published as `areaServed`, never sent to Google, which requires a place id); saved even when the address is locked, if sent without address fields; codes `service_area.too_many`, `service_area.name.too_long` (per chip, `service_area.N`). |
| `hours` | `opening_hours`, `special_hours` | Each key is saved on its own and **replaces the whole of what it names**. `opening_hours` takes what `/locations` takes. Error keys are prefixed: `opening_hours.day_1.period_0.close_time`, `special_hours.day_0.date`. |
| `social` | `social_profiles`, `booking_links` | `social_profiles`: an object of network → URL; the `/business` rules. `booking_links`: `{ appointment, text_messaging, whatsapp }` — an http(s) link, an international number (`+8801712345678`, sent to Google as `sms:+…`), a wa.me link; whole set, `""` clears one; codes `booking.appointment.invalid`, `booking.text_messaging.invalid`, `booking.whatsapp.invalid` on `booking_links.<field>`. Either or both; both are checked before either is written. The read also carries `booking_offered` (which of the three Google offers this listing; `null` = unknown) and the location's `country`. |
| `attributes` | `values` | `{ attribute_id: value }`. `true`/`false`, one string, a list of strings, or a list of URLs. **`null` withdraws an answer**, which is not the same as `false`. Only the attributes named are touched. |
| `services` | `items` | **The whole list, in order.** An entry with an `id` is updated, one without is created, a stored service left out is **removed**. Every entry is validated before any is written; error keys are `items.0.name`. `403 fhint_service_limit_reached` only when the list grows past the plan limit. |
| `media` | — | `400 fhint_section_read_only`. Photos arrive by upload, not by a section save. |

#### Description rules

At most **750 characters** (`business.description.too_long`) and **no web
address** (`business.description.has_link`) — Google refuses both. These are
enforced on `/business` as well. A link is a scheme (`https://`), a `www.`
prefix, or a bare domain on a common ending; two-letter country endings are
left out so a missing space after a full stop is not mistaken for one.

#### Special hours

```json
{ "section": "hours", "fields": { "special_hours": [
  { "date": "2026-12-25", "is_closed": true, "note": "Christmas Day" },
  { "date": "2026-12-24", "periods": [ { "open_time": "09:00", "close_time": "13:00" } ] },
  { "date": "2026-12-31", "is_24h": true }
] } }
```

A day is closed, open all day, or open for one or more periods; the period
rules are the weekly ones. Also refused: a date that does not exist
(`special_hours.date.invalid`) and the same date twice
(`special_hours.date.duplicate`), each keyed by the day's position in the list
sent. `note` is the owner's own label and is never sent to Google.

### Choosing a location

Every profile route — `GET /profile`, the section save, and both publish
routes — takes an optional `location_id`. Left out or `0`, it means the
primary location, which is all a single-location site ever needs. Any other
id reads, saves or publishes that location: its address, hours, attributes,
photos and its own Google listing. The business-level sections (`info`,
`social`, `services`) are the same whichever location is named — **except
`info`'s name, description, phone, additional phones, website, opening date and categories**, which follow the
location: the primary location's are the business's, and any other location
keeps its own, field by field, showing the business's for a field it has not
set. Saving them for a non-primary location writes them to that location
(`business_name`, `description`, `phone`, `additional_phones`, `website`, `opening_date`, categories) and leaves
the business's alone. A non-primary location's description has its own
`history`. **`social` and `services` follow the location too:** a non-primary
location shows the business's links until it saves its own set, and has its
own list of services from the start (empty), stored with its `location_id`.
`404 fhint_location_not_found` for an id that does not exist.

`meta` on `GET /profile` carries what a header and a switcher need:

```json
{
  "location":  { "id": 2, "name": "Harbour branch", "address": "2 Harbour Road, Chittagong, BD", "is_primary": false },
  "locations": [ { "id": 1, "name": "Head office", "address": "…", "is_primary": true }, { "id": 2, "name": "Harbour branch", "address": "…", "is_primary": false } ],
  "reviews":   { "average": 4.6, "count": 184 }
}
```

`listings` is every listing on the Google account, imported or not:
`{ location_name, title, address, location_id }`, with `location_id` `0` for
one that has no location here yet. The switcher offers those too.

### `POST /profile/listing`

`{ "location_name": "locations/123" }` → `{ "location_id": 2, "created": true,
"imported": ["address", …] }`. Gives a listing with no location here a **new**
location, links it, and imports its own details onto it (name, description,
address, map pin, hours, phone, website, categories, social links, services)
— never into the business. Again for the same listing returns the same
location (`created: false`). `404 fhint_import_unknown_profile`,
`409 fhint_business_required`.

`reviews` is the rating of this location's own Google listing, from stored
reviews; `null` when the location has no listing or no review has been read.

### `POST /profile/google/refresh`

Reads what only Google can supply for the profile, **and changes nothing on
Google**: the attributes Google offers this listing, the answers it holds, its
photos and its Maps id. Takes `location_id`. `409` with the publish routes'
codes when Google is not connected or the location has no listing.

Answers with the whole profile, as `GET /profile` does, plus what arrived:

```json
{ "meta": { "refresh": { "categories": false, "attributes": 42, "answers": 26, "photos": 15, "failed": [] } } }
```

`failed` names any part Google refused (`attributes`, `answers`, `photos`);
the others are still stored. The request fails only when nothing arrived.

- **Categories are filled in, never replaced.** A location with no category
  of its own is given the ones its listing has on Google, and `categories` is
  `true`. One that has a category keeps it.
- **Ready-made services.** `data.services.google_types` lists the services
  Google already has for this listing's categories, as `{ id, label,
  category }`; `refresh.service_types` is how many. Save a service with
  `google_item_type: "structured"` and that `id` as `google_service_type_id`
  to send it as Google's own entry rather than as free text.
- **Attributes are per listing.** `data.attributes.definitions` is Google's
  own list for this listing — it depends on the category and country — as
  `{ id, label, group, type, options, allows_false }`. `type` is `bool`,
  `enum` or `repeated_enum`; link attributes are left to the Social section.
  `allows_false` says whether a yes/no attribute can be answered "no": where
  it cannot, send `null` to withdraw the answer instead of `false`.
- **An answer edited here is kept.** Google's answers are stored as clean
  copies; one changed on this site and not yet sent is not overwritten.
- **Photos are not downloaded.** Each is a row pointing at Google's own copy.
  Videos are skipped, and so are photos customers added.
- `meta.google.refreshed_at` is when this last ran, `null` if it never has.

### Photos

| Route | |
|---|---|
| `POST /profile/media` | Multipart: `file`, `role` (`logo`, `cover`, `gallery`), `location_id`. Keeps the photo in the media library as **waiting**. Sends nothing to Google. |
| `POST /profile/media/{id}/publish` | Sends one waiting photo to Google. One request per photo, so each reports for itself. |
| `DELETE /profile/media/{id}` | Forgets a photo that has not been sent, and deletes its file. `409 fhint_media_on_google` for one that has. |

All three answer with the whole profile. Waiting photos are under
`data.media.pending` with `state` `pending`, `uploading` or `failed` (and
`error`, Google's own words, when failed).

A file is checked before it is kept — `400 fhint_validation_failed` with
`fields.file`: `media.type.unsupported` (JPG and PNG only),
`media.size.too_large` (over 5 MB), `media.size.too_small`,
`media.dimensions.too_small` (under 250 px on a side). Choosing a second logo
or cover replaces the one that was waiting.

Publishing sends the file's bytes rather than a link to them, so it works on
a site Google cannot reach. `404 fhint_media_not_found` when the photo is not
this location's; `409 fhint_media_already_sent`; `502` when Google refuses,
with the photo left as `failed`.

### `POST /profile/publish/plan`

Works out what publishing the profile to Google would send, **and sends
nothing**. It reads the mapped listing twice — the location and its attribute
values — and compares them with what is stored here. It is a `POST` because
it calls Google, which draws on a quota every site using this plugin shares.

`409 fhint_google_not_connected`, `409 fhint_business_required` or
`409 fhint_google_not_mapped` when there is nothing to plan against.

```json
{
  "data": {
    "steps": [
      {
        "id": "location",
        "fields": [
          { "field": "description", "from": "What Google has.", "to": "What this site has." },
          { "field": "hours", "from": ["1 09:00-17:00"], "to": ["1 09:00-17:00", "6 10:00-14:00"] }
        ],
        "mask": ["profile.description", "regularHours"],
        "payload": { "profile": { "description": "What this site has." }, "regularHours": { "periods": [] } },
        "token": "97e86571c847cb64d4c72ed5c65e58a2"
      },
      {
        "id": "attributes",
        "fields": [{ "field": "social.facebook", "from": "", "to": "https://facebook.com/example" }],
        "mask": ["attributes/url_facebook"],
        "payload": { "attributes": [] },
        "token": "2dd52dc12bc2470ad8af50909b718935"
      }
    ],
    "skipped": [
      { "field": "categories", "reason": "empty_here", "google": { "primary": "Corporate office", "additional": [] } }
    ],
    "unchanged": ["name", "website", "phone", "special_hours", "services"],
    "requests": 2
  },
  "meta": {
    "listing": {
      "location": "locations/7390686751421120583",
      "title": "AsCode",
      "maps_url": "https://maps.google.com/maps?cid=3455100975346056492",
      "read_at": "2026-10-10 22:26:38"
    }
  }
}
```

**`steps`** — one per request a publish would make, in the order to run them.
A step with nothing to send is left out, so an up-to-date profile has no steps
and `requests` is 0.

| Step | Fields it can carry |
|---|---|
| `location` | `name`, `description`, `website`, `phone`, `categories`, `hours`, `special_hours`, `services` |
| `attributes` | `social.<network>`, `attribute.<id>` |

`from` is what Google has, `to` what would be sent: a string for text; for
`hours`, `special_hours` and `services` a sorted list of lines
(`"6 10:00-14:00"` is Saturday — day numbers, Sunday is 0); for `categories`
`{ primary, additional }`. `token` is a fingerprint of the step's mask and
payload, for the step request to send back so a stale plan is refused.

**`skipped`** — fields that will *not* be sent, and why:

| `reason` | Meaning |
|---|---|
| `empty_here` | This site has nothing for it and Google does. **A plan never clears a field**: Google erases any field named with no value, and "never typed here" cannot be told from "removed on purpose". `google` carries what Google shows. |
| `no_google_id` | The category was typed freehand and has no Google id. |
| `not_allowed` | Google does not let this listing's service list be changed. |
| `not_on_google` | Google has no attribute for it (a Yelp link). |

**What a plan protects, beyond not clearing:**

- A weekday nobody has filled in here keeps Google's hours for that day; only
  days this site has an answer for are replaced.
- With no additional categories chosen here, Google's are kept when the main
  one changes.
- Changing the main phone number sends Google's extra numbers back with it.
- Only attribute answers changed here since the last push are named.
- Services switched off here are left out of the list.

A phone number is the same number with or without its country code, and a link
the same with or without `www`, a scheme or a trailing slash — neither is
reported as a change.

### `POST /profile/publish/step`

Runs one step of a plan. **This is the only route in the plugin that changes
anything on Google.**

```json
{ "step": "location", "token": "97e86571c847cb64d4c72ed5c65e58a2", "validate_only": false }
```

| Param | |
|---|---|
| `step` | **Required.** `location` or `attributes`. |
| `token` | **Required.** The step's `token` from the plan — 32 hex characters. |
| `validate_only` | Default `false`. When `true`, Google checks the request and saves nothing. `location` only. |

Run the plan's steps in order, one request each, and show each answer as it
arrives:

```json
{ "data": { "step": "location", "ok": true, "validate_only": false,
            "fields": ["description", "hours"], "pushed_at": "2026-10-10 22:41:08" } }
```

**The step is planned again before it is sent**, from a fresh read of the one
thing it touches, and `token` must match that fresh plan. So what reaches
Google is only ever what the plan showed:

| Status | Code | When |
|---|---|---|
| `409` | `fhint_publish_stale` | The profile or the listing changed since the plan. Plan again. |
| `409` | `fhint_publish_nothing_to_send` | Google already has everything in this step. |
| `400` | `fhint_validate_only_unsupported` | `validate_only` on `attributes`; Google has no dry run for them. |
| `400` | `fhint_google_rejected` | Google refused a value. Nothing was changed. |
| `409` | `fhint_google_not_connected` / `fhint_google_not_mapped` | As for the plan. |
| `502` | `fhint_google_request_failed` / `fhint_google_unreachable` | No permission, over quota, or Google unreachable. |

A refused value comes back in the usual validation shape, so the message
attaches to the field at fault:

```json
{ "code": "fhint_google_rejected",
  "data": { "status": 400, "step": "location",
            "fields": { "description": ["google.profile_description_contains_url"] } } }
```

The code is `google.` plus Google's own reason in lower case —
`google.string_too_long`, `google.invalid_category`, `google.invalid_url` — or
`google.invalid_value` where Google names only the field. Keys are the plan's
field ids; `step` is used when Google blames no particular field.

After a real step, `meta.google.pushed_at` on `GET /profile` carries the time,
and attribute answers that were sent are no longer marked as changed. A
validate-only step records nothing.

Google throttles edits made in quick succession, so leave the steps
sequential rather than firing them together.


### The guided import: `GET /google/import/steps`, `POST /google/import/step`

The import as six steps, **one request each**, so a screen can tick them off
as they land. This is what the setup screen at `#/setup/google` runs after a
first Google sign-in.

`GET /google/import/steps` lists them in order and calls nothing:

```json
{ "data": [
  { "id": "identity", "fields": ["name", "description"] },
  { "id": "category", "fields": ["categories", "business_type"] },
  { "id": "address",  "fields": ["address", "coordinates"] },
  { "id": "contact",  "fields": ["phone", "website", "social"] },
  { "id": "hours",    "fields": ["hours"] },
  { "id": "services", "fields": ["services"] }
] }
```

`POST /google/import/step` runs one:

```json
{ "step": "address", "location_name": "locations/123" }
```

```json
{ "data": { "step": "address", "status": "imported",
            "applied": ["address", "coordinates"], "skipped": [],
            "location_id": 1, "next": "contact" } }
```

| `status` | Meaning |
|---|---|
| `imported` | Something was written. |
| `empty` | Google holds nothing for this step. Not a failure. |
| `unchanged` | Google has it, and nothing new needed writing. |

`next` is the step that follows, `""` after the last. Run them in order: the
first step (`identity`) reads Google and creates the business and location if
there are none; the others reuse that read for two minutes, so six steps cost
one read of Google, not six. A step run with no stored read asks Google
itself. The read is kept on the server and never taken from the request.

Errors are those of `POST /google/import`, plus `400` for a step that does
not exist.

**Where a sign-in lands.** After a successful Google sign-in the browser is
sent to `#/setup/google` when no Google listing belongs to a location yet (a
first connection), and to `#/google` otherwise. A failed sign-in always
returns to `#/google`, where its explanation is shown.


## Reviews

Reviews still live on Google's legacy v4 API, which is why they are read
through a different host than the rest of the Google module. Everything this
plugin shows comes from stored rows; only `POST /reviews/sync` and the reply
routes contact Google.

### `GET /reviews`

Stored reviews, newest first. `location_name` limits to one Google location,
`unanswered=1` to those with no reply. `per_page` (0–100, default 20) and
`offset` page through them; `total` ignores paging so a "showing x of y" line
is honest.

```json
{
  "data": [
    {
      "review_id": "abc123",
      "location_name": "locations/42",
      "location_title": "FoundHint",
      "reviewer_name": "Asha Rahman",
      "is_anonymous": false,
      "star_rating": 5,
      "comment": "Fixed my boiler the same afternoon.",
      "reply_comment": "",
      "needs_reply": true,
      "reviewed_at": "2026-09-14 09:12:00",
      "replied_at": null
    }
  ],
  "meta": { "total": 1 }
}
```

`star_rating` is **0 when Google sent `STAR_RATING_UNSPECIFIED`**, which is
not one star. A rating of 0 is left out of the average rather than counted
as zero stars, which would invent a bad review nobody wrote.

An anonymous reviewer carries **no name and no photo**, even when Google
sends them.

### `GET /reviews/state`

Counts, the average, the distribution across one to five stars, when Google
last answered, and the locations reviews can be read for. This is what the
screen and any dashboard card read; it never measures and never calls Google.


Each entry in `locations` is `{ location_name, title, location_id, count }`;
`location_id` is the FoundHint location the listing belongs to, 0 for none.

### `POST /reviews/sync`

Asks Google for fresh reviews, for one `location_name` or for every synced
location. Upserts on Google's review id, so a re-read updates rows rather
than multiplying them, and **removes reviews Google no longer returns** — a
deleted review must not linger in a count the owner is judged on.

`data` carries the counts (`locations`, `reviews`, `failed`) and `meta.state`
the refreshed figures, so a screen does not need a second request after a sync.

`409 fhint_no_google_locations` when no Google locations have been read yet.
When every location refuses, the first error is returned rather than a
cheerful "0 reviews": reporting nothing read as success would tell an owner
nobody has reviewed them when in fact Google never answered.

### `PUT /reviews/{review_id}/reply`

Posts the owner's reply to a review **on Google, publicly**, or replaces the
one already there — Google keeps one reply per review, so writing and editing
are the same call.

```json
{ "comment": "Thank you, Asha! See you next time." }
```

`comment` is plain text (tags are stripped, line breaks kept), required, and
at most **4,096 bytes** — Google counts bytes, so a reply in Bengali or with
emoji reaches the limit in far fewer letters.

The stored row changes **only after Google accepts** the reply, so the
screen never shows a reply the public cannot see. `data` is the review as
now stored (the same shape as one entry of `GET /reviews`), and `meta.state`
that listing's refreshed figures, so "Waiting on a reply" moves without a
second request.

```json
{
  "data": {
    "review_id": "abc123",
    "reply_comment": "Thank you, Asha! See you next time.",
    "replied_at": "2026-10-18 08:30:00",
    "needs_reply": false
  },
  "meta": { "state": { "count": 2, "unanswered": 1, "average": 5 } }
}
```

| Status | Code | When |
|---|---|---|
| 400 | `fhint_validation_failed` | `data.fields.comment` is `review.reply.required` or `review.reply.too_long` |
| 404 | `fhint_review_not_found` | No stored review has that id — read reviews from Google again |
| 502 | `fhint_google_request_failed` | Google refused or failed; the stored reply is unchanged |
| 500 | `fhint_save_failed` | Google took the reply but it could not be stored here |

### `DELETE /reviews/{review_id}/reply`

Removes the reply on Google, then clears it here. Same response shape as
the `PUT`. If Google says there is no reply (already removed on Google
itself), the stored copy is cleared and the call succeeds — the owner's goal
holds either way.

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

### What the site publishes

Every public page prints **one business entry per location** that can be
published (it has a name and a complete address, and is not permanently
closed). Each location's entry carries its own name, description, phone,
website, address, map pin, hours, links (`sameAs`) and — when it has
services — its own `OfferCatalog`. A location whose own main category maps
to a schema.org type is published as that type (a pet shop on the same
account as a software company is a `PetStore`).

| Node | `@id` |
|---|---|
| The primary location | `{home}#localbusiness`, catalog `{home}#services` — unchanged |
| Any other location | `{home}#localbusiness-{location_id}`, catalog `{home}#services-{location_id}` |

A location that trades under the business's own name is a branch, and its
entry carries `"parentOrganization": { "@id": "{home}#localbusiness" }`. One
with a name of its own is a separate business and claims no parent.

A location that cannot be published is left out on its own; it does not
stop the others. The `fhint_schema_locations` filter (location ids, primary
first) narrows which locations a page prints — e.g. only the one a location
page is about.

### `GET /schema`

The graph for **one** location, for the admin preview: optional
`location_id` (default 0, the primary location). `404` for a location that
does not exist.

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

### `GET /google/categories`

Searches Google's Business Profile categories. **It never contacts Google and
needs no connection**: the list ships with the plugin
(`includes/App/Google/data/google-categories.json`, rebuilt with
`npm run categories:update`), so it works on a site that has not connected an
account yet.

| Param | Default | |
|---|---|---|
| `search` | `''` | What was typed, up to 100 characters. Empty lists alphabetically. |
| `per_page` | `20` | 1–50. |
| `offset` | `0` | For paging. |

```json
{
  "data": [
    {
      "id": "gcid:dentist",
      "name": "Dentist",
      "bucket": "Health & Medical",
      "in_us": true,
      "variants": []
    }
  ],
  "meta": {
    "total": 3,
    "max_additional": 9,
    "list": { "count": 4053, "updated": "2026-10-10" }
  }
}
```

**Ranking**, best first: the exact name; names starting with the search; names
where a later word starts with it; names containing it; then categories found
only through another wording Google uses. Those last ones carry
`"matched": "Physician"` so a screen can say why "Doctor" appeared. Every
word typed must be present, in any order. Searching for an id (`gcid:dentist`
or `categories/gcid:dentist`) returns exactly that category.

**Show `bucket`, and key on `id`, never on `name`.** Two different categories
can share a name — there are two "Swimming pool" entries with different ids.

`meta.total` ignores paging. `meta.max_additional` is how many extra
categories Google allows beside the primary one.

There is no write route here. A chosen category is saved through
[`/business`](#categories-on-a-business), which validates it against this
same list.

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
