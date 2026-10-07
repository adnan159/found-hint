# Business Profile — data structure

Every piece of data on the Profile screen: what the API hands the client, where
it is stored, and what it becomes when it is pushed to Google.

Three columns in the tables below:

- **API** — the key in the `/profile` document.
- **Storage** — `table.column`. **Bold** means it does not exist yet.
- **Google** — the field in the push payload, or `—` when it is never sent.

Existing columns were read from `includes/Database/Create*Table.php`. Google
field names are the ones `App\Google\ImportMapper` already reads back from real
payloads, so they are verified rather than taken from documentation.

---

## The shape of the document

One route serves the whole screen. Sections save one at a time, matching the
Save button on each card.

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
| `extra_categories[]` | `business.secondary_categories` (JSON) — **ids need adding** | `categories.additionalCategories[]` |
| `description` | `business.description` | `profile.description` |
| `website` | `business.website` | `websiteUri` |
| `phone` | `business.phone` | `phoneNumbers.primaryPhone` |
| `cid` | **`google_locations.cid`** | read-only |
| `suggestions[]` | **not stored** — derived from the ranking scan | — |
| `history[]` | **new table `fhint_business_description_history`** | — |

**Categories are the biggest gap.** Google wants resource names
(`categories/gcid:dentist`), and we store display text. Nothing can be pushed
until the category list is fetched for the right locale and an id is kept
beside every name.

**Three rules the screen enforces that the API currently does not**, all of
which must live in `Business::validate()` because Google rejects the push
otherwise:

| Rule | Error code |
|---|---|
| description ≤ 750 characters | `business.description.too_long` |
| description contains no URL | `business.description.has_link` |
| at most 9 extra categories | `business.categories.too_many` |

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
| `special[]` | **new table `fhint_location_special_hours`** | `specialHours.specialHourPeriods[]` |

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

## Summary of what has to be built

**New tables**

| Table | Holds |
|---|---|
| `fhint_location_special_hours` | holiday and one-off days |
| `fhint_location_attributes` | the ticked attribute values |
| `fhint_media` | photos, their role and sync state |
| `fhint_business_description_history` | previous descriptions |
| `fhint_google_reference` | cached category list, service types, attribute definitions |

**New columns**

| Column | Why |
|---|---|
| `business.primary_category_id` | Google needs `gcid:` ids, not names |
| `google_locations.cid` | shown on the screen, asked for by directories |
| `services.google_item_type` | structured or free-form |
| `services.google_service_type_id` | the structured id |

**Each needs `FHINT_DB_VERSION` bumped and the dbDelta idempotency check
re-run.** `Tables::keys()` must gain every new name too, or uninstall leaves
the table behind — a trap the reviews table already walked into once.

**The one thing with no home yet:** a record of which fields changed since the
last push. `updateMask` is destructive — naming a field with no value *clears*
it on the listing — so the mask must be built from a real diff, never from the
whole form.
