# REST API

Namespace: **`fhint/v1`** — `https://example.com/wp-json/fhint/v1`

The namespace and version are constants on `FHINT\API` (`NAMESPACE_NAME`,
`VERSION`). Reference those rather than hardcoding route strings; the helper
`fhint_rest_url( '/business' )` builds a full URL from them.

> **Status:** every route below is registered and guarded, and that is
> verified by `tests/Smoke/rest-routes.php`. **No route has yet been called
> against a real database** — see `docs/PROGRESS.md`. Treat the response
> examples as the intended contract, not as captured output.

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
