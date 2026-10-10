# Business Profile — data structure

Every piece of data on the Profile screen: what the API hands the client, where
it is stored, and what it becomes when it is pushed to Google.

Three columns in the tables below:

- **API** — the key in the `/profile` document.
- **Storage** — `table.column`. **Bold** marks storage added for this screen
  (database versions 0.6.0 and 0.7.0), or says so where something is still
  not stored.
- **Google** — the field in the push payload, or `—` when it is never sent.

Existing columns were read from `includes/Database/Create*Table.php`. Google
field names are the ones `App\Google\ImportMapper` already reads back from real
payloads, so they are verified rather than taken from documentation.

---

## The shape of the document

One route serves the whole screen. Sections save one at a time, matching the
Save button on each card.

> **The route is built, and `includes/API/README.md` is the reference for its
> exact shape.** The JSON examples in the numbered sections below were the
> sketch made before it existed. The storage and Google columns in each table
> are accurate; the key names in the examples are not always. As built, each
> section uses the names its entity already had, so an error keyed by field
> lands on the right input whichever route saved it:
>
> | Sketch below | As built |
> |---|---|
> | `info.primary_category: { id, name }` | `primary_category_id` + `primary_category` |
> | `info.extra_categories` | `secondary_categories` |
> | `address.line_1`, `line_2` | `address_line_1`, `address_line_2` |
> | `hours.regular`, `hours.special` | `opening_hours` (the `/locations` shape), `special_hours` |
> | `social.google` / `social.directories` | one `social_profiles` object, eight networks |
> | `attributes.groups` | `values` (stored answers) + `definitions` (empty until fetched) |
> | `meta.google.can_edit` | not yet — needs Google's metadata |

```
GET   /fhint/v1/profile
PATCH /fhint/v1/profile      { "section": "info", "fields": { … } }
```

```jsonc
{
  "data": {
    "info":       { … },
    "address":    { … },
    "hours":      { … },
    "social":     { … },
    "attributes": { … },
    "services":   { … },
    "media":      { … }
  },
  "meta": {
    "google": {
      "connected":  true,
      "location":   "locations/495652196029249217",
      "account":    "accounts/105451349307150237346",
      "synced_at":  "2026-10-07 19:31:56",
      "can_edit":   true,          // from Google's own metadata
      "verified":   true
    },
    "limits": { "services": 0, "categories": 9 }
  }
}
```

`meta.google.can_edit` is not decoration. Google reports per location whether
it may be edited and whether the service list may be changed; a push that
ignores it fails at Google instead of in our own validation, which is a much
worse place to discover it.

---

## 1 · Business Information

```jsonc
"info": {
  "name": "Northside Dental Care",
  "primary_category":  { "id": "gcid:dentist", "name": "Dentist" },
  "extra_categories": [ { "id": "gcid:dental_clinic", "name": "Dental Clinic" } ],
  "description": "…",
  "website": "https://…",
  "phone": "+1 512 555 0134",
  "cid": "9451387654872888532",
  "suggestions": [ { "id": "gcid:pediatric_dentist", "name": "Pediatric Dentist",
                     "used_by_competitors": true } ],
  "history": [ { "at": "2026-09-02 10:04:00", "text": "…" } ]
}
```

| API | Storage | Google |
|---|---|---|
| `name` | `business.name` | `title` |
| `primary_category.name` | `business.primary_category` | — |
| `primary_category.id` | **`business.primary_category_id`** | `categories.primaryCategory.name` |
| `extra_categories[]` | `business.secondary_categories` (JSON list of `{ id, name }`) | `categories.additionalCategories[]` |
| `description` | `business.description` | `profile.description` |
| `website` | `business.website` | `websiteUri` |
| `phone` | `business.phone` | `phoneNumbers.primaryPhone` |
| `cid` | **`google_locations.cid`** | read-only |
| `suggestions[]` | **not stored** — derived from the ranking scan | — |
| `history[]` | **new table `fhint_description_history`** | — |

**Categories are stored as Google ids.** Google wants resource names
(`categories/gcid:dentist`); `primary_category_id` holds `gcid:dentist`, each
extra category is a `{ id, name }` pair, and `Categories::resource_name()`
produces the form the API takes. The ids come from the list bundled with the
plugin and searched by `GET /google/categories` — see `includes/API/README.md`.
That list is US English; names for other locales would come from Google's own
`categories.list` into `fhint_google_reference`.

**Three rules the screen enforces that the API currently does not**, all of
which must live in `Business::validate()` because Google rejects the push
otherwise:

| Rule | Error code |
|---|---|
| description ≤ 750 characters | `business.description.too_long` |
| description contains no URL | `business.description.has_link` |
| at most 9 extra categories | `business.categories.too_many` — **done** |

**`suggestions[].used_by_competitors` is the Pro flag** in this section. The
suggestions themselves are free; knowing which ones competitors use is not.

---

## 2 · Address and Location

```jsonc
"address": {
  "line_1": "410 Congress Ave, Suite 210",
  "line_2": "",
  "city": "Austin", "region": "Texas",
  "postal_code": "78701", "country": "US",
  "latitude": 30.2849, "longitude": -97.7341,
  "locked": true,
  "edit_url": "https://business.google.com/…"
}
```

| API | Storage | Google |
|---|---|---|
| `line_1` / `line_2` | `locations.address_line_1` / `_2` | `storefrontAddress.addressLines[]` |
| `city` | `locations.city` | `storefrontAddress.locality` |
| `region` | `locations.region` | `storefrontAddress.administrativeArea` |
| `postal_code` | `locations.postal_code` | `storefrontAddress.postalCode` |
| `country` | `locations.country` | `storefrontAddress.regionCode` |
| `latitude` / `longitude` | `locations.latitude` / `.longitude` | `latlng` |
| `locked` | derived from `meta.google.verified` | — |

**This section never pushes.** Google does not accept address edits on a
verified listing without re-verification, so the screen shows the values read
back from Google and sends the owner to Google to change them.

---

## 3 · Business Hours

```jsonc
"hours": {
  "regular": [
    { "day": 1, "closed": false, "open_24h": false,
      "periods": [ { "open": "09:00", "close": "12:30" },
                   { "open": "13:30", "close": "17:30" } ] }
  ],
  "special": [
    { "date": "2026-12-25", "closed": true, "open_24h": false,
      "periods": [] }
  ]
}
```

| API | Storage | Google |
|---|---|---|
| `regular[].day` | `location_hours.day_of_week` | `periods[].openDay` / `closeDay` |
| `regular[].periods[].open` | `location_hours.open_time` | `periods[].openTime` |
| `regular[].periods[].close` | `location_hours.close_time` | `periods[].closeTime` |
| `regular[].closed` | `location_hours.is_closed` | day omitted from `periods` |
| `regular[].open_24h` | `location_hours.is_24h` | `openTime {}` + `closeTime { hours: 24 }` |
| a break in the day | second row, `period_index` 1 | a second period on that day |
| `special[]` | **new table `fhint_special_hours`** | `specialHours.specialHourPeriods[]` |

**Breaks already work.** `period_index` exists, so "09:00–12:30, 13:30–17:30"
is two rows — the design's "+ Add a break" needs no schema change.

**Times are objects on Google, not strings:** `{ "hours": 17, "minutes": 30 }`,
and an absent `hours` means midnight. Google writes the end of a day as **hour
24**; the import already special-cases it, and a push has to emit the same
convention or an all-day entry becomes "closes at 00:00".

---

## 4 · Social Links and Listings

```jsonc
"social": {
  "google": {
    "facebook":  { "url": "https://facebook.com/…", "state": "ok" },
    "instagram": { "url": "", "state": "empty" },
    "whatsapp":  { "country": "+1", "number": "512 555 0134" }
  },
  "directories": {
    "yelp":      { "url": "…", "state": "ok" },
    "tripadvisor": { "url": "…", "state": "bad" }
  },
  "same_as": [ "https://facebook.com/…", "https://yelp.com/…" ]
}
```

| API | Storage | Google |
|---|---|---|
| `google.*` | `business.social_profiles` (JSON) | `attributes` → `url_facebook`, `url_instagram`, … |
| `directories.*` | **same JSON, separate key** | — |
| `same_as` | derived | — |

Two groups, two destinations. **The Google group travels as attributes**, on
the attributes endpoint rather than the location patch — the same place the
import already reads them from. **The directories group never leaves the
site**; it exists to feed `sameAs` in the schema markup.

`state` is computed per link — `empty`, `ok`, `bad` — and the screen's footnote
is the rule: *empty and broken links are left out of the markup.*

---

## 5 · Attributes

```jsonc
"attributes": {
  "groups": [
    { "id": "accessibility", "name": "Accessibility",
      "items": [ { "id": "wheelchair_accessible_entrance",
                   "name": "Wheelchair accessible entrance",
                   "type": "bool", "value": true } ] }
  ]
}
```

| API | Storage | Google |
|---|---|---|
| `groups[].items[].value` | **new table `fhint_location_attributes`** | `attributes[]` on the attributes endpoint |
| `groups[]`, names, types | **cached from Google per category** | read-only reference |

Nothing here exists today. Attributes are **category-dependent** — the valid
set for a dentist differs from a hotel's — so the available list has to be
fetched per location and cached, not hard-coded. Values are typed: boolean,
enum, repeated enum and URL.

---

## 6 · Services

```jsonc
"services": {
  "items": [
    { "id": 12, "name": "Teeth whitening", "type": "structured",
      "google_service_type_id": "job_type_id:teeth_whitening",
      "description": "…", "price": 320, "currency": "USD",
      "status": "offered" }
  ],
  "google_types": [ { "id": "job_type_id:teeth_whitening",
                      "name": "Teeth whitening" } ]
}
```

| API | Storage | Google |
|---|---|---|
| `name` | `services.name` | `freeFormServiceItem.label.displayName` |
| `description` | `services.description` | `…ServiceItem.description` |
| `price` / `currency` | `services.price` / `.currency` | `…ServiceItem.price` |
| `status` | `services.status` | item present or absent |
| `type` | **`services.google_item_type`** | which of the two shapes is sent |
| `google_service_type_id` | **`services.google_service_type_id`** | `structuredServiceItem.serviceTypeId` |
| `google_types[]` | **cached per category** | from `categories[].serviceTypes[]` |

**Two shapes, and the distinction is load-bearing.** A *structured* item needs
a `serviceTypeId` Google already offers for the category; anything else must be
*free-form* with a category and a label. The import already reads both. This is
why the design's modal offers "Choose a service Google already knows".

`services.sort_order`, `slug`, `url`, `image_*` already exist and are unused by
this screen.

---

## 7 · Photos

```jsonc
"media": {
  "logo":   { "id": 9, "url": "…", "source": "google" },
  "cover":  { "id": 10, "url": "…", "source": "owner" },
  "gallery": [ { "id": 11, "url": "…", "source": "customer",
                 "state": "synced" } ],
  "pending": [ { "key": "tmp-1", "url": "…", "ok": true,
                 "reason": "" } ]
}
```

| API | Storage | Google |
|---|---|---|
| everything | **new table `fhint_media`** | v4 `accounts/*/locations/*/media` |
| `source` | `fhint_media.source` — `owner` or `customer` | `locationAssociation` |
| `logo` / `cover` | `fhint_media.role` | `LOGO` / `COVER` / `ADDITIONAL` |
| `pending[]` | rows not yet uploaded | — |

Nothing exists today. Photos are the one section on **legacy v4**, the API
enabled for reviews. Google's constraints are stated on the screen and belong
in validation too: JPG or PNG, ≤ 5 MB, logo square, cover 16:9.

---

## Publishing to Google

**The plan and step requests are built** (`POST /profile/publish/plan` and
`/profile/publish/step`, documented in `includes/API/README.md`), for the
location and attributes steps. Photos are not.
This section records what was worked out about the push, so the request counts
and rules are not only in a conversation.

Two corrections from reading a real listing: the attribute for X is still
`url_twitter`, and **Google has no Yelp attribute**, so a Yelp link is never
sent. The CID is the `cid=` value inside `metadata.mapsUri`.

### How many requests a publish costs

| What is saved | Requests to Google |
|---|---|
| Business Information, Hours and Services, in any combination | **1** |
| Social links and Attributes, any number of them | **1** |
| Photos | **1 per photo** |
| Address | **0** — never pushed |
| Nothing changed | **0** — do not send an empty patch |

A typical "save everything" is **2 requests**, plus one per new photo. It
cannot be fewer: these are three different Google endpoints.

| Call | Endpoint | Carries |
|---|---|---|
| Location patch | Business Information API, `PATCH locations/{id}?updateMask=…` | `title`, `categories`, `profile.description`, `websiteUri`, `phoneNumbers`, `regularHours`, `specialHours`, `serviceItems` |
| Attributes patch | Business Information API, `locations/{id}/attributes` with an attribute mask | every tick-box attribute and every social URL (`url_facebook`, `url_instagram`, …) |
| Media upload | legacy v4, `accounts/{a}/locations/{l}/media` | one photo, with its role (`LOGO`, `COVER`, `ADDITIONAL`) |

Social links and attributes are **one call because they are one thing** on
Google. Links Google has no attribute for — Yelp among them — cost nothing:
they are stored locally and only feed `sameAs`.

### Rules the push must follow

- **Both masks are destructive.** A field or attribute named in a mask with no
  value is *cleared* on the live listing. The mask is built from a diff against
  what Google last reported, never from the whole form.
- **Services replace the whole list.** `serviceItems` is a repeated field; the
  patch must always carry the complete list. Anything left out is removed from
  the listing.
- **Reference data is fetched once and cached** in `fhint_google_reference` —
  category ids, service types per category, attribute definitions per
  category. Fetching it per save would turn a 2-request publish into 5.
- **Diff against the stored copy** in `fhint_google_locations`, not a fresh
  read of the location on every save.
- **Check Google's own flags first.** The location metadata says whether the
  listing can be edited and whether its service list can be modified. A push
  that ignores them fails at Google instead of in our validation.
- **Every site shares one Google Cloud project quota**, because all installs
  go through the FoundHint Connect client. Send only what changed.
- **A validate-only dry run** costs one extra request and touches nothing. Use
  it for the first publish of a session, not for every one.

### The endpoints

**Decided: one click, a plan, then one request per step.** A single streamed
request was considered and rejected — nginx, Cloudflare and gzip routinely
hold a streamed response back until it is complete, so progress would arrive
all at once, and the whole publish would have to fit one PHP time limit.

```
POST /fhint/v1/profile/publish/plan     → the steps this publish needs
POST /fhint/v1/profile/publish/step     { "step": "location" }   → that step's result
```

The plan compares what is stored with what Google last reported and returns
only the steps that have something to send — for example *business details,
hours and services*, *social links and attributes*, *photo 1 of 3*. The
browser then runs them in turn and ticks each off as its answer arrives. A
failed step can be retried on its own, and each request is short.

**The response is per section, never a single success flag.** The attributes
call can fail while the location patch succeeds, and the owner needs to know
their hours went live and their Facebook link did not.

```jsonc
{ "data": {
    "info":   { "ok": true },
    "hours":  { "ok": true },
    "social": { "ok": false, "code": "fhint_google_attribute_rejected" },
    "media":  { "ok": true, "uploaded": 3, "failed": 1 }
} }
```

### Where the code goes

`includes/App/Google/Push/`, one class per target, because each has different
rules:

| File | Job |
|---|---|
| `Publisher.php` | works out what differs, runs the plan, returns per-section results |
| `UpdateMask.php` | turns a diff into a mask — the dangerous piece; build and test it first |
| `LocationPatch.php` | the combined info + hours + services call |
| `AttributesPatch.php` | social links and attributes |
| `MediaUpload.php` | photos, one at a time, each with its own failure handling |

### Sync times

`synced_at` on `fhint_google_locations` means *when we last read Google*, and
`pushed_at` (database version 0.8.0) *when we last changed it* — kept apart
because "we read Google 2 hours ago" and "your changes reached Google 2 hours
ago" are different claims and the screen makes both. `relativeTime()` in
`src/admin/pages/dashboard/components/ScoreCard.jsx` already formats
"2 hours ago" and should move to `src/admin/lib/` when the Profile screen
needs it.

---

## Storage added for this screen

Built and live, and dbDelta is idempotent. The four columns round-trip in
`tests/Integration/database.php`, through the repositories and through REST.
The five tables exist but have **no repositories yet**, so nothing reads or
writes them.

**Tables — database version 0.6.0**

| Table | Holds |
|---|---|
| `fhint_special_hours` | holiday and one-off days |
| `fhint_location_attributes` | attribute values, including social URLs |
| `fhint_media` | photos, their role and sync state |
| `fhint_description_history` | previous descriptions |
| `fhint_google_reference` | cached category list, service types, attribute definitions |

**Columns — database version 0.7.0**

| Column | Why |
|---|---|
| `business.primary_category_id` | Google needs `gcid:` ids, not names |
| `google_locations.cid` | shown on the screen, asked for by directories |
| `services.google_item_type` | structured or free-form |
| `services.google_service_type_id` | the structured id |

A new column has to be added in four places or it is dead storage: the entity's
`blank()` defaults, the repository's hand-built column list, the
**writable-field whitelist**, and the REST `args`. `uninstall.php` keeps its own
literal list of tables; `tests/Smoke/schema-format.php` fails when it drifts
from `Tables::keys()`.

## Still to build

- The Profile screen itself, against `GET` / `PATCH /fhint/v1/profile`
  (built — see `includes/API/README.md`).
- The category chooser, and `primary_category_id` set by the Google import.
- Fetching Google's reference data into `fhint_google_reference`, which is
  what fills `attributes.definitions` and `services.google_types`.
- Photos: upload, list, and the media repository's write side.
- Everything under **Publishing to Google** above, including a record of what
  changed since the last push and a `pushed_at` timestamp.
