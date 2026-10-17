# Business Profile — front-end guide

The Business Profile is one screen with seven collapsible sections: business
information, address, hours, social links, attributes, services and photos.

- Screen route: `#/business`, optionally with `?location=2` (which location)
  and `?tab=hours` (which tab opens: `info`, `address`, `hours`, `social`,
  `attributes`, `services`, `media`)
- There are no separate Locations or Services screens: the old addresses
  `#/locations`, `#/locations/{id}` and `#/services` redirect here, to the
  matching tab and location
- Reference code: `src/admin/pages/profile/`,
  `src/admin/store/api/profileApi.js`
- The setup flow that leads here is in [setup-widget.md](setup-widget.md).

All sample values below are real, captured from the running plugin, with long
lists shortened.

---

## 1. Endpoints at a glance

Base: `window.FHINT.rest_url` (namespace `fhint/v1`).

| # | Method | Endpoint | Body | What it does | Touches Google? |
|---|---|---|---|---|---|
| 1 | `GET` | `/profile` | — | Read the whole profile | no |
| 2 | `PATCH` | `/profile` | JSON | Save one section | no |
| 3 | `GET` | `/google/categories` | — | Search Google's categories | no |
| 4 | `POST` | `/profile/google/refresh` | JSON | Read attributes, photos, services from Google | reads only |
| 4b | `POST` | `/profile/listing` | JSON | Give a Google listing with no location here a location of its own | reads only |
| 5 | `POST` | `/profile/media` | multipart | Keep a chosen photo | no |
| 6 | `POST` | `/profile/media/{id}/publish` | JSON | Send one photo to Google | **writes** |
| 7 | `DELETE` | `/profile/media/{id}` | — | Remove a photo not yet sent | no |
| 8 | `POST` | `/profile/publish/plan` | JSON | Show what would be sent to Google | reads only |
| 9 | `POST` | `/profile/publish/step` | JSON | Send one step to Google | **writes** |

Only #6 and #9 change anything on Google. **Saving (#2) never does.**

---

## 2. Basics for every request

**Headers**

| Header | Value |
|---|---|
| `X-WP-Nonce` | `window.FHINT.rest_nonce` — required on every request |
| `Content-Type` | `application/json` for JSON bodies. **Do not set it for the photo upload** — the browser must write the multipart boundary itself. |

Send cookies (`credentials: "same-origin"`). The user needs the
`manage_options` capability: logged out → `401`, no permission → `403`.

**Never build a query string with `?` by hand.** On a plain-permalink site
the REST root already contains `?rest_route=`. Use `withQuery()`:

```js
import { withQuery } from "@/store/api/baseApi";

withQuery("/profile", { location_id: 2 });
// pretty permalinks → "/profile?location_id=2"
// plain permalinks  → "/profile&location_id=2"
```

**Success envelope**

```json
{ "data": {}, "meta": {} }
```

**Failure shape**

```json
{
  "code": "fhint_location_not_found",
  "message": "That location no longer exists.",
  "data": { "status": 404 }
}
```

**Validation failure** — codes per field, not sentences:

```json
{
  "code": "fhint_validation_failed",
  "message": "Some of the submitted values are not valid.",
  "data": {
    "status": 400,
    "fields": {
      "name": ["business.name.required"],
      "description": ["business.description.has_link"]
    }
  }
}
```

Turn a code into a sentence with `messageForCode()` and get the per-field map
with `fieldErrors(error)`, both in `src/admin/lib/errors.js`. Attach each
message to its own input.

**Timestamps** are UTC strings, `YYYY-MM-DD HH:MM:SS`:

```js
new Date(value.replace(" ", "T") + "Z");
```

**`location_id`** — every endpoint here accepts it. Leave it out (or send
`0`) for the main location. See [section 9](#9-switching-location).

---

## 3. How the screen works

1. **One `GET /profile` paints all seven sections.**
2. The user edits any sections. Nothing is saved yet.
3. **One Save bar at the bottom** (no Save button inside a section). It sends
   **one `PATCH /profile` per changed section**, one after another.
4. Each section header shows its state: *Unsaved changes*, *Saving…*,
   *Saved*, *Not saved*. A refused section does not stop the others.
5. Saving stores to this site only. **Send to Google** is a separate button
   and a separate flow ([section 8](#8-send-to-google)).

Suggested state:

```js
base   = modelsFor(profile.sections);   // what the server holds
drafts = {};                            // only sections the user edited
model  = (id) => drafts[id] ?? base[id];
dirty  = ids where drafts[id] exists and differs from base[id];
```

After a section saves, delete its draft. Helpers to convert between the API
shape and form state are in `src/admin/pages/profile/model.js`.

---

## 4. `GET /profile` — read the whole profile

**Request**

| Query param | Type | Required | Value |
|---|---|---|---|
| `location_id` | int | no | A location id. Omit for the main location. |

```
GET /profile
GET /profile?location_id=2
```

**Response `200`**

```json
{
  "data": {
    "info": {
      "name": "Shokher Tola 80Tk – Pet Shop Mirpur-12",
      "primary_category": "Pet store",
      "primary_category_id": "gcid:pet_store",
      "secondary_categories": [
        { "id": "gcid:pet_sitter", "name": "Pet sitter" },
        { "id": "gcid:pet_groomer", "name": "Pet groomer" }
      ],
      "description": "Shokher Tola 80Tk Pet Shop Mirpur is your trusted local pet store offering a complete range of quality pet food, accessories and grooming items.",
      "website": "https://shokhertola80taka.com/",
      "phone": "01335-521022",
      "cid": "9451307654072888532",
      "history": [
        { "id": 3, "description": "An earlier wording.", "source": "user", "created_at": "2026-10-10 09:12:44" }
      ]
    },
    "address": {
      "location_id": 1,
      "address_line_1": "305 (3rd Floor,Lift 2), House No 05, Noor Islam Molla Avenue, Mirpur 12",
      "address_line_2": "(Sultan's Dine and Meena Bazar Building),",
      "city": "Dhaka",
      "region": "",
      "postal_code": "1216",
      "country": "BD",
      "latitude": 23.8279543,
      "longitude": 90.363575,
      "formatted": "305 (3rd Floor,Lift 2), House No 05, Noor Islam Molla Avenue, Mirpur 12, Dhaka, 1216, BD",
      "locked": true
    },
    "hours": {
      "location_id": 1,
      "timezone": "",
      "opening_hours": {
        "days": [
          {
            "day_of_week": 1,
            "day_name": "Monday",
            "configured": true,
            "periods": [
              { "period_index": 0, "open_time": "09:00", "close_time": "17:00", "is_closed": false, "is_24h": false, "is_overnight": false }
            ]
          },
          {
            "day_of_week": 2,
            "day_name": "Tuesday",
            "configured": true,
            "periods": [
              { "period_index": 0, "open_time": "", "close_time": "", "is_closed": false, "is_24h": true, "is_overnight": false }
            ]
          },
          {
            "day_of_week": 3,
            "day_name": "Wednesday",
            "configured": false,
            "periods": []
          }
        ],
        "has_any_hours": true,
        "period_count": 7
      },
      "special_hours": [
        { "date": "2026-12-25", "is_closed": true, "is_24h": false, "note": "Christmas Day", "periods": [] }
      ]
    },
    "social": {
      "social_profiles": {
        "facebook": "https://www.facebook.com/shokhertolapetshop/",
        "instagram": "",
        "x": "",
        "linkedin": "",
        "youtube": "https://www.youtube.com/@shokhertola80tkpetshop",
        "tiktok": "",
        "pinterest": "https://www.pinterest.com/shokhertola80tkpetshop/",
        "yelp": ""
      },
      "networks": ["facebook", "instagram", "x", "linkedin", "youtube", "tiktok", "pinterest", "yelp"],
      "same_as": [
        "https://www.facebook.com/shokhertolapetshop/",
        "https://www.youtube.com/@shokhertola80tkpetshop",
        "https://www.pinterest.com/shokhertola80tkpetshop/"
      ]
    },
    "attributes": {
      "location_id": 1,
      "values": [
        { "attribute_id": "has_delivery", "value_type": "bool", "value": true, "is_dirty": false, "synced_at": "2026-10-11 18:28:26" },
        { "attribute_id": "has_hearing_loop", "value_type": "bool", "value": false, "is_dirty": false, "synced_at": "2026-10-11 18:28:26" },
        { "attribute_id": "wi_fi", "value_type": "enum", "value": "free_wi_fi", "is_dirty": false, "synced_at": "2026-10-11 18:28:26" }
      ],
      "definitions": [
        {
          "id": "is_owned_by_women",
          "label": "Identifies as women-owned",
          "group": "From the business",
          "type": "bool",
          "options": [{ "value": true, "label": "Identifies as women-owned" }],
          "allows_false": false
        },
        {
          "id": "has_delivery",
          "label": "Delivery",
          "group": "Service options",
          "type": "bool",
          "options": [
            { "value": true, "label": "Delivery" },
            { "value": false, "label": "No delivery" }
          ],
          "allows_false": true
        },
        {
          "id": "wi_fi",
          "label": "Wi-Fi",
          "group": "Amenities",
          "type": "enum",
          "options": [
            { "value": "free_wi_fi", "label": "Free" },
            { "value": "paid_wi_fi", "label": "Paid" }
          ],
          "allows_false": false
        },
        {
          "id": "pay_credit_card_types_accepted",
          "label": "Credit cards",
          "group": "Payments",
          "type": "repeated_enum",
          "options": [
            { "value": "mastercard", "label": "MasterCard" },
            { "value": "visa", "label": "VISA" }
          ],
          "allows_false": false
        }
      ]
    },
    "services": {
      "items": [
        {
          "id": 7,
          "business_id": 1,
          "name": "Cat grooming",
          "slug": "cat-grooming",
          "description": "A full groom and nail trim.",
          "image_attachment_id": 0,
          "image_url": "",
          "price": 25,
          "currency": "USD",
          "url": "",
          "google_item_type": "structured",
          "google_service_type_id": "job_type_id:cat_grooming",
          "status": "active",
          "sort_order": 0,
          "created_at": "2026-10-11 18:40:02",
          "updated_at": "2026-10-11 18:40:02"
        }
      ],
      "limits": { "limit": 5, "used": 1, "remaining": 4, "unlimited": false, "can_add": true },
      "google_types": [
        { "id": "job_type_id:cat_boarding", "label": "Cat boarding", "category": "Pet sitter" },
        { "id": "job_type_id:cat_grooming", "label": "Cat grooming", "category": "Pet sitter" }
      ]
    },
    "media": {
      "logo": {
        "id": 15, "location_id": 1, "role": "logo", "source": "owner", "state": "synced",
        "attachment_id": 0,
        "url": "https://lh3.googleusercontent.com/a-/ALV-UjV6j_mX8sz2RxKNL56",
        "google_name": "accounts/105451349307150237346/locations/14430845320964201281/media/profile",
        "mime_type": "", "file_size": 0, "width": 0, "height": 0, "error": "",
        "uploaded_at": null, "synced_at": "2026-10-11 18:28:29"
      },
      "cover": {
        "id": 11, "location_id": 1, "role": "cover", "source": "owner", "state": "synced",
        "attachment_id": 0,
        "url": "https://lh3.googleusercontent.com/tgvWurkc0rbFR7q3M2b8MF59st",
        "google_name": "accounts/105451349307150237346/locations/14430845320964201281/media/AF1QipN",
        "mime_type": "", "file_size": 0, "width": 869, "height": 423, "error": "",
        "uploaded_at": "2025-10-14 07:45:14", "synced_at": "2026-10-11 18:28:29"
      },
      "gallery": [
        {
          "id": 1, "location_id": 1, "role": "gallery", "source": "owner", "state": "synced",
          "attachment_id": 0,
          "url": "https://lh3.googleusercontent.com/nYJLhkoYPYotJMc9L-9dliMWKl",
          "google_name": "accounts/105451349307150237346/locations/14430845320964201281/media/AF1QipO",
          "mime_type": "", "file_size": 0, "width": 3024, "height": 4032, "error": "",
          "uploaded_at": "2026-03-09 12:49:30", "synced_at": "2026-10-11 18:28:29"
        }
      ],
      "pending": [
        {
          "id": 16, "location_id": 1, "role": "gallery", "source": "owner", "state": "pending",
          "attachment_id": 42,
          "url": "http://localhost:8100/wp-content/uploads/2026/10/shopfront.jpg",
          "google_name": "",
          "mime_type": "image/jpeg", "file_size": 141883, "width": 500, "height": 500, "error": "",
          "uploaded_at": null, "synced_at": null
        }
      ],
      "location_id": 1,
      "count": 15
    }
  },
  "meta": {
    "exists": true,
    "location": {
      "id": 1,
      "name": "Shokher Tola 80Tk – Pet Shop Mirpur-12",
      "address": "305 (3rd Floor,Lift 2), House No 05, Noor Islam Molla Avenue, Mirpur 12, Dhaka, 1216, BD",
      "is_primary": true
    },
    "locations": [
      { "id": 1, "name": "Shokher Tola 80Tk – Pet Shop Mirpur-12", "address": "305 (3rd Floor,Lift 2), … Dhaka, 1216, BD", "is_primary": true },
      { "id": 2, "name": "FoundHint", "address": "House 23, Shekhertek 3, Mohammadpur, Dhaka, 1207, BD", "is_primary": false }
    ],
    "listings": [
      { "location_name": "locations/14430845320964201281", "title": "Shokher Tola 80Tk – Pet Shop Mirpur-12",
        "address": "305 (3rd Floor,Lift 2), … Dhaka, 1216, BD", "location_id": 1 },
      { "location_name": "locations/495652196029249217", "title": "FoundHint",
        "address": "House 23, Shekhertek 3, Mohammadpur, Dhaka, 1207, BD", "location_id": 0 }
    ],
    "reviews": { "average": 4.6, "count": 184 },
    "google": {
      "status": "connected",
      "connected": true,
      "mapped": true,
      "location": "locations/14430845320964201281",
      "account": "accounts/105451349307150237346",
      "title": "Shokher Tola 80Tk – Pet Shop Mirpur-12",
      "verified": false,
      "synced_at": "2026-10-11 18:31:14",
      "pushed_at": null,
      "refreshed_at": "2026-10-11 18:28:26"
    },
    "limits": { "description": 750, "additional_categories": 9 }
  }
}
```

### `meta` fields

| Field | Type | Use |
|---|---|---|
| `exists` | bool | `false` on a site with no business yet. Sections still render, empty. |
| `location` | object \| null | The location this response is for |
| `locations` | array | Every location here, main one first |
| `listings` | array | Every listing on the Google account, imported or not. `location_id` is the location it belongs to, `0` = no location here yet. |
| `reviews` | object \| null | Rating of this location's Google listing. `null` = no listing or no reviews read. |
| `google.connected` | bool | Signed in to Google |
| `google.mapped` | bool | **This location** has a Google listing. Use this — not `connected` — to enable Refresh / Send / Upload. |
| `google.synced_at` | string \| null | When the listing was last read |
| `google.refreshed_at` | string \| null | When attributes and photos were last read. `null` = never. |
| `google.pushed_at` | string \| null | When this site last sent anything to Google |
| `limits.description` | int | Max description length. Use it; do not hard-code 750. |
| `limits.additional_categories` | int | Max extra categories. Do not hard-code 9. |

**Errors**

| Status | Code | When |
|---|---|---|
| `404` | `fhint_location_not_found` | `location_id` does not exist |

---

## 5. `PATCH /profile` — save one section

`POST` and `PUT` work too. One request saves one section.

**Request body**

| Field | Type | Required | Value |
|---|---|---|---|
| `section` | string | yes | `info` · `address` · `hours` · `social` · `attributes` · `services` |
| `fields` | object | yes | That section's fields. **A key you leave out is not changed.** |
| `location_id` | int | no | A location id. Omit for the main location. |

**Response `200`** — `data` is **that section as it now reads** (the same
shape as inside `GET /profile`); `meta` is the same as `GET /profile` plus
`section`:

```json
{
  "data": { "…the section…": "" },
  "meta": {
    "section": "info",
    "exists": true,
    "location": { "id": 1, "name": "…", "address": "…", "is_primary": true },
    "locations": [],
    "reviews": null,
    "google": { "status": "connected", "connected": true, "mapped": true, "…": "" },
    "limits": { "description": 750, "additional_categories": 9 }
  }
}
```

Write `data` into your cached `sections[section]` and merge `meta`. No
refetch needed.

**Errors (any section)**

| Status | Code | When |
|---|---|---|
| `400` | `fhint_validation_failed` | A value was refused; `data.fields` says which |
| `400` | `rest_invalid_param` | `section` is not a valid id |
| `400` | `fhint_section_read_only` | `section: "media"` — photos have their own endpoints |
| `403` | `fhint_service_limit_reached` | Services list grew past the plan limit (`data.limit`) |
| `404` | `fhint_location_not_found` | `location_id` does not exist |
| `409` | `fhint_address_locked` | Address belongs to a linked Google listing |
| `409` | `fhint_business_required` | No business yet — save `info` first |
| `500` | `fhint_save_failed` | The write did not reach the database |

The six sections follow, each with its own request and response.

---

### 5.1 Section `info` — Business Information

**Fields you can send**

| Field | Type | Rule |
|---|---|---|
| `name` | string | Required, max 255 |
| `primary_category_id` | string | A Google category id, e.g. `gcid:pet_store`. Get it from the [category search](#6-get-googlecategories--search-categories). |
| `primary_category` | string | Only for a hand-typed name that has no id |
| `secondary_categories` | string[] | **Category ids.** Replaces the whole list. Max `limits.additional_categories`. |
| `description` | string | Max `limits.description` characters. **No web link.** |
| `website` | string | Full URL |
| `phone` | string | |

Read-only in the response: `cid` (Google's Maps id) and `history` (earlier
descriptions, newest first).

**Request**

```json
{
  "section": "info",
  "fields": {
    "name": "Shokher Tola 80Tk – Pet Shop Mirpur-12",
    "primary_category_id": "gcid:pet_store",
    "secondary_categories": ["gcid:pet_sitter", "gcid:pet_groomer"],
    "description": "Your trusted local pet store in Mirpur for food, accessories and grooming.",
    "website": "https://shokhertola80taka.com/",
    "phone": "01335-521022"
  }
}
```

**Response `200`**

```json
{
  "data": {
    "name": "Shokher Tola 80Tk – Pet Shop Mirpur-12",
    "primary_category": "Pet store",
    "primary_category_id": "gcid:pet_store",
    "secondary_categories": [
      { "id": "gcid:pet_sitter", "name": "Pet sitter" },
      { "id": "gcid:pet_groomer", "name": "Pet groomer" }
    ],
    "description": "Your trusted local pet store in Mirpur for food, accessories and grooming.",
    "website": "https://shokhertola80taka.com/",
    "phone": "01335-521022",
    "cid": "9451307654072888532",
    "history": [
      { "id": 4, "description": "Your trusted local pet store in Mirpur for food, accessories and grooming.", "source": "user", "created_at": "2026-10-12 06:41:10" }
    ]
  },
  "meta": { "section": "info" }
}
```

**Validation error `400`**

```json
{
  "code": "fhint_validation_failed",
  "message": "Some of the submitted values are not valid.",
  "data": {
    "status": 400,
    "fields": {
      "name": ["business.name.required"],
      "description": ["business.description.has_link"]
    }
  }
}
```

| Field key | Codes |
|---|---|
| `name` | `business.name.required`, `business.name.too_long` |
| `description` | `business.description.too_long`, `business.description.has_link` |
| `website` | `business.website.invalid` |
| `phone` | `business.phone.invalid` |
| `primary_category_id` | `business.category_id.unknown` |
| `secondary_categories` | `business.categories.unknown`, `business.categories.too_many`, `business.categories.includes_primary` |

**Notes**

- Send category **ids**, never names.
- "View on Google" link: `https://maps.google.com/?cid={cid}`. Hide it while
  `cid` is `""`.
- **Name, description, phone, website and categories follow the location.**
  The main location's are the business's. Any other location keeps its own;
  a field it has not set shows the business's. Just send `location_id` — the
  server decides where each value is stored. Sending `""` for a non-main
  location's phone or website clears its own value, so the business's shows
  again (the name cannot be empty).
- `history` is the history of the description on screen: the business's for
  the main location, the location's own for any other.

---

### 5.2 Section `address` — Address and Location

**Fields you can send**

| Field | Type | Rule |
|---|---|---|
| `address_line_1` | string | max 255 |
| `address_line_2` | string | max 255 |
| `city` | string | |
| `region` | string | |
| `postal_code` | string | |
| `country` | string | Two letters, e.g. `BD` |
| `latitude` | number \| null | -90 to 90 |
| `longitude` | number \| null | -180 to 180 |

**Request**

```json
{
  "section": "address",
  "fields": {
    "address_line_1": "12 Agrabad Road",
    "city": "Chittagong",
    "postal_code": "4100",
    "country": "BD"
  }
}
```

**Response `200`**

```json
{
  "data": {
    "location_id": 2,
    "address_line_1": "12 Agrabad Road",
    "address_line_2": "",
    "city": "Chittagong",
    "region": "",
    "postal_code": "4100",
    "country": "BD",
    "latitude": null,
    "longitude": null,
    "formatted": "12 Agrabad Road, Chittagong, 4100, BD",
    "locked": false
  },
  "meta": { "section": "address" }
}
```

**When `locked` is `true`** the location has a Google listing and the address
is Google's. A save answers:

```json
{
  "code": "fhint_address_locked",
  "message": "This address comes from your Google Business Profile. Change it on Google and it will be picked up here.",
  "data": { "status": 409 }
}
```

So: make the inputs read-only, show the notice, link to
`https://business.google.com/`.

| Field key | Codes |
|---|---|
| any address field | `address.too_long` |
| `country` | `address.country.invalid` |
| `latitude` | `location.latitude.invalid` |
| `longitude` | `location.longitude.invalid` |

**Notes**

- `latitude` / `longitude` can be `null`. **`0` is a real coordinate** — test
  for `null`, not for falsiness. Draw the map only when both are numbers.

---

### 5.3 Section `hours` — Business Hours

**Fields you can send**

| Field | Type | Rule |
|---|---|---|
| `opening_hours` | object | The week, keyed by day number. **Replaces the whole week.** |
| `special_hours` | array | Holidays and one-off days. **Replaces the whole list.** |

Send one, the other, or both. A key you leave out is not changed.

Day numbers: `0` Sunday, `1` Monday … `6` Saturday. Times are `HH:MM`, 24-hour.

**A day is one of four things**

| State | In the response | To send |
|---|---|---|
| Not set | `"configured": false`, `"periods": []` | **Leave the day out** |
| Closed | a period with `"is_closed": true` | `{ "is_closed": true }` |
| Open 24 hours | a period with `"is_24h": true` | `{ "is_24h": true }` |
| Open for hours | periods with times | `{ "periods": [ { "open_time", "close_time" } ] }` |

**Request**

```json
{
  "section": "hours",
  "fields": {
    "opening_hours": {
      "1": { "periods": [{ "open_time": "09:00", "close_time": "17:00" }] },
      "2": { "periods": [
        { "open_time": "09:00", "close_time": "12:00" },
        { "open_time": "13:00", "close_time": "18:00" }
      ] },
      "3": { "is_24h": true },
      "0": { "is_closed": true }
    },
    "special_hours": [
      { "date": "2026-12-25", "is_closed": true, "note": "Christmas Day" },
      { "date": "2026-12-24", "periods": [{ "open_time": "09:00", "close_time": "13:00" }] },
      { "date": "2026-12-31", "is_24h": true }
    ]
  }
}
```

In this request Thursday, Friday and Saturday are left out, so they become
"not set". Tuesday has two periods — a break in the middle of the day.

**Response `200`**

```json
{
  "data": {
    "location_id": 1,
    "timezone": "",
    "opening_hours": {
      "days": [
        { "day_of_week": 1, "day_name": "Monday", "configured": true,
          "periods": [{ "period_index": 0, "open_time": "09:00", "close_time": "17:00", "is_closed": false, "is_24h": false, "is_overnight": false }] },
        { "day_of_week": 2, "day_name": "Tuesday", "configured": true,
          "periods": [
            { "period_index": 0, "open_time": "09:00", "close_time": "12:00", "is_closed": false, "is_24h": false, "is_overnight": false },
            { "period_index": 1, "open_time": "13:00", "close_time": "18:00", "is_closed": false, "is_24h": false, "is_overnight": false }
          ] },
        { "day_of_week": 3, "day_name": "Wednesday", "configured": true,
          "periods": [{ "period_index": 0, "open_time": "", "close_time": "", "is_closed": false, "is_24h": true, "is_overnight": false }] },
        { "day_of_week": 4, "day_name": "Thursday", "configured": false, "periods": [] },
        { "day_of_week": 5, "day_name": "Friday", "configured": false, "periods": [] },
        { "day_of_week": 6, "day_name": "Saturday", "configured": false, "periods": [] },
        { "day_of_week": 0, "day_name": "Sunday", "configured": true,
          "periods": [{ "period_index": 0, "open_time": "", "close_time": "", "is_closed": true, "is_24h": false, "is_overnight": false }] }
      ],
      "has_any_hours": true,
      "period_count": 5
    },
    "special_hours": [
      { "date": "2026-12-24", "is_closed": false, "is_24h": false, "note": "", "periods": [{ "open_time": "09:00", "close_time": "13:00", "is_overnight": false }] },
      { "date": "2026-12-25", "is_closed": true, "is_24h": false, "note": "Christmas Day", "periods": [] },
      { "date": "2026-12-31", "is_closed": false, "is_24h": true, "note": "", "periods": [] }
    ]
  },
  "meta": { "section": "hours" }
}
```

`days` always has seven entries, Monday first.

**Validation error `400`** — keys are prefixed with the field and the position:

```json
{
  "code": "fhint_validation_failed",
  "message": "Some of the submitted values are not valid.",
  "data": {
    "status": 400,
    "fields": {
      "opening_hours.day_1.period_0.close_time": ["hours.range.zero_length"],
      "opening_hours.day_2": ["hours.periods.overlap"],
      "special_hours.day_0.date": ["special_hours.date.invalid"]
    }
  }
}
```

| Key | Attach the message to |
|---|---|
| `opening_hours.day_1` | Monday as a whole |
| `opening_hours.day_1.period_0.open_time` | Monday's first opening time |
| `opening_hours.day_1.period_0.close_time` | Monday's first closing time |
| `special_hours.day_0.date` | The first special day's date (position in the list you sent) |
| `special_hours.day_0.period_0.close_time` | Its first closing time |

Codes: `hours.open_time.required`, `hours.close_time.required`,
`hours.range.zero_length`, `hours.periods.overlap`,
`special_hours.date.invalid`, `special_hours.date.duplicate`.

---

### 5.4 Section `social` — Social Links and Listings

**Fields you can send**

| Field | Type | Rule |
|---|---|---|
| `social_profiles` | object | Network → URL. **Send every network**; an empty string removes a link. |

Draw one input per entry in the response's `networks` list — do not
hard-code the list.

**Request**

```json
{
  "section": "social",
  "fields": {
    "social_profiles": {
      "facebook": "https://www.facebook.com/shokhertolapetshop/",
      "instagram": "https://www.instagram.com/shokhertola/",
      "x": "",
      "linkedin": "",
      "youtube": "https://www.youtube.com/@shokhertola80tkpetshop",
      "tiktok": "",
      "pinterest": "",
      "yelp": ""
    }
  }
}
```

**Response `200`**

```json
{
  "data": {
    "social_profiles": {
      "facebook": "https://www.facebook.com/shokhertolapetshop/",
      "instagram": "https://www.instagram.com/shokhertola/",
      "x": "",
      "linkedin": "",
      "youtube": "https://www.youtube.com/@shokhertola80tkpetshop",
      "tiktok": "",
      "pinterest": "",
      "yelp": ""
    },
    "networks": ["facebook", "instagram", "x", "linkedin", "youtube", "tiktok", "pinterest", "yelp"],
    "same_as": [
      "https://www.facebook.com/shokhertolapetshop/",
      "https://www.instagram.com/shokhertola/",
      "https://www.youtube.com/@shokhertola80tkpetshop"
    ]
  },
  "meta": { "section": "social" }
}
```

`same_as` is what goes into the site's markup: the working links only.

**Validation error `400`**

```json
{
  "code": "fhint_validation_failed",
  "message": "Some of the submitted values are not valid.",
  "data": { "status": 400, "fields": { "social_profiles.facebook": ["social.url.invalid"] } }
}
```

**Note:** a Yelp link is saved and used in the markup but is never sent to
Google — Google has no place for it.

**Per location:** a non-main location shows the business's links until it
saves its own. Once it has saved links — even all empty — the whole set is
its own, so removing a link there does not bring the business's back.

---

### 5.5 Section `attributes` — Attributes

**The list of attributes is not fixed.** `definitions` in the response is
what Google offers *this listing* — it depends on the category and country.
Draw the section from `definitions`, grouped by `group`. Never hard-code it.

`definitions` is `[]` until Google has been read
([section 7.1](#71-post-profilegooglerefresh--read-from-google)) or when the
location has no listing. In that case show a **Read from Google** button.

**How to draw each type**

| `type` | Control | Value to send |
|---|---|---|
| `bool` | Tick box | `true`, `false`, or `null` |
| `enum` | Options — one may be chosen | the option's `value` (string), or `null` |
| `repeated_enum` | Options — several may be chosen | array of `value`s, or `null` |

**Unticking a `bool`**

| `allows_false` | Send | Meaning |
|---|---|---|
| `true` | `false` | Publishes "no" (e.g. "No delivery") |
| `false` | `null` | Withdraws the answer — Google has no "no" for it |

**Fields you can send**

| Field | Type | Rule |
|---|---|---|
| `values` | object | `{ attribute_id: value }`. **Only the attributes you name are changed.** |

**Request**

```json
{
  "section": "attributes",
  "fields": {
    "values": {
      "has_delivery": false,
      "has_wheelchair_accessible_entrance": true,
      "wi_fi": "free_wi_fi",
      "pay_credit_card_types_accepted": ["visa", "mastercard"],
      "is_owned_by_women": null
    }
  }
}
```

**Response `200`**

```json
{
  "data": {
    "location_id": 1,
    "values": [
      { "attribute_id": "has_delivery", "value_type": "bool", "value": false, "is_dirty": true, "synced_at": "2026-10-11 18:28:26" },
      { "attribute_id": "has_wheelchair_accessible_entrance", "value_type": "bool", "value": true, "is_dirty": true, "synced_at": null },
      { "attribute_id": "pay_credit_card_types_accepted", "value_type": "repeated_enum", "value": ["visa", "mastercard"], "is_dirty": true, "synced_at": null },
      { "attribute_id": "wi_fi", "value_type": "enum", "value": "free_wi_fi", "is_dirty": true, "synced_at": "2026-10-11 18:28:26" }
    ],
    "definitions": [
      { "id": "has_delivery", "label": "Delivery", "group": "Service options", "type": "bool",
        "options": [{ "value": true, "label": "Delivery" }, { "value": false, "label": "No delivery" }],
        "allows_false": true }
    ]
  },
  "meta": { "section": "attributes" }
}
```

| Value field | Meaning |
|---|---|
| `is_dirty` | `true` = changed here, not sent to Google yet |
| `synced_at` | When Google last had this value; `null` = never |
| `value_type` | `bool` · `enum` · `repeated_enum` · `url`. **Skip `url` ones** — the Social section owns links. |

**Validation error `400`** — key is `values.` plus the attribute id:

```json
{
  "code": "fhint_validation_failed",
  "message": "Some of the submitted values are not valid.",
  "data": { "status": 400, "fields": { "values.wi_fi": ["attributes.value.invalid"] } }
}
```

---

### 5.6 Section `services` — Services

**Fields you can send**

| Field | Type | Rule |
|---|---|---|
| `items` | array | **The whole list, in display order.** |

**Each item**

| Field | Type | Rule |
|---|---|---|
| `id` | int | Include for an existing service. **Leave out for a new one.** |
| `name` | string | Required, max 255 (the popup limits it to 140) |
| `description` | string | Max 250 in the popup |
| `price` | number \| `""` | `""` = no price |
| `currency` | string | Three letters (`USD`). Required when there is a price; `""` when there is none. |
| `status` | string | `active` = shown on Google · `inactive` = hidden but kept |
| `google_item_type` | string | `structured` (a Google service) or `free_form` (custom name) |
| `google_service_type_id` | string | An `id` from `google_types` when `structured`; `""` otherwise |

**The two kinds of service** (the switch at the top of the popup)

| Popup tab | `google_item_type` | `google_service_type_id` |
|---|---|---|
| Custom name | `free_form` | `""` |
| Google service | `structured` | e.g. `job_type_id:cat_grooming` |

The **Google service** dropdown is the response's `google_types`. It is `[]`
until Google has been read, for a location with no listing, or when the
categories have none. Do not offer a type another row already uses.

**Request**

```json
{
  "section": "services",
  "fields": {
    "items": [
      {
        "id": 7,
        "name": "Cat grooming",
        "description": "A full groom and nail trim.",
        "price": 25,
        "currency": "USD",
        "status": "active",
        "google_item_type": "structured",
        "google_service_type_id": "job_type_id:cat_grooming"
      },
      {
        "name": "Home visits",
        "description": "",
        "price": "",
        "currency": "",
        "status": "active",
        "google_item_type": "free_form",
        "google_service_type_id": ""
      }
    ]
  }
}
```

Here service `7` is updated and "Home visits" is created. **Any stored
service not in the list is deleted.**

**Each location has its own list.** The main location's list is the
business's. Any other location starts with an empty list of its own; saving
with its `location_id` adds to, edits and removes from that list only. The
same service name can be on two lists.

**Response `200`**

```json
{
  "data": {
    "items": [
      {
        "id": 7, "business_id": 1, "name": "Cat grooming", "slug": "cat-grooming",
        "description": "A full groom and nail trim.",
        "image_attachment_id": 0, "image_url": "",
        "price": 25, "currency": "USD", "url": "",
        "google_item_type": "structured", "google_service_type_id": "job_type_id:cat_grooming",
        "status": "active", "sort_order": 0,
        "created_at": "2026-10-11 18:40:02", "updated_at": "2026-10-12 06:44:51"
      },
      {
        "id": 8, "business_id": 1, "name": "Home visits", "slug": "home-visits",
        "description": "",
        "image_attachment_id": 0, "image_url": "",
        "price": null, "currency": "", "url": "",
        "google_item_type": "free_form", "google_service_type_id": "",
        "status": "active", "sort_order": 1,
        "created_at": "2026-10-12 06:44:51", "updated_at": "2026-10-12 06:44:51"
      }
    ],
    "limits": { "limit": 5, "used": 2, "remaining": 3, "unlimited": false, "can_add": true },
    "google_types": [
      { "id": "job_type_id:cat_boarding", "label": "Cat boarding", "category": "Pet sitter" },
      { "id": "job_type_id:cat_grooming", "label": "Cat grooming", "category": "Pet sitter" }
    ]
  },
  "meta": { "section": "services" }
}
```

`limits.unlimited: true` (with `limit: 0`) means no cap. Otherwise disable
**Add service** when the list on screen has reached `limit`.

**Validation error `400`** — keys are the position in the list you sent:

```json
{
  "code": "fhint_validation_failed",
  "message": "Some of the submitted values are not valid.",
  "data": {
    "status": 400,
    "fields": {
      "items.0.name": ["service.name.required"],
      "items.1.currency": ["service.currency.required_with_price"]
    }
  }
}
```

Codes: `service.name.required`, `service.name.too_long`,
`service.price.invalid`, `service.price.negative`,
`service.currency.required_with_price`, `service.currency.invalid`,
`service.not_found` (key `items.N.id`), `service.duplicate`.

**Plan limit `403`**

```json
{
  "code": "fhint_service_limit_reached",
  "message": "This plan allows up to 5 of these.",
  "data": { "status": 403, "limit": 5 }
}
```

One bad row refuses the whole list; nothing is half-saved.

---

## 6. `GET /google/categories` — search categories

Searches the list shipped with the plugin. **Never calls Google**, so it is
safe while typing (debounce about 180 ms).

**Request**

| Query param | Type | Required | Value |
|---|---|---|---|
| `search` | string | no | What the user typed |
| `per_page` | int | no | 1–50 |
| `offset` | int | no | For paging |

```
GET /google/categories?search=pet&per_page=8
```

**Response `200`**

```json
{
  "data": [
    { "id": "gcid:pet_store", "name": "Pet store", "bucket": "Veterinary, Pets & Animals", "in_us": true, "variants": [] },
    { "id": "gcid:pet_sitter", "name": "Pet sitter", "bucket": "Veterinary, Pets & Animals", "in_us": true, "variants": [] }
  ],
  "meta": {
    "total": 22,
    "max_additional": 9,
    "list": { "count": 4053, "updated": "2026-10-10" }
  }
}
```

| Field | Use |
|---|---|
| `id` | **Store and send this**, not the name |
| `name` | Show it |
| `bucket` | Show beside the name — two categories can share a name |
| `meta.total` | Matches in all, before paging |

Build it as a combobox: `role="combobox"` on the input, a `listbox` of
results, arrow keys to move, Enter to choose, Escape to close. Text typed
without choosing has no id — keep it, but warn it cannot be sent to Google.

---

## 7. Google data and photos

### 7.1 `POST /profile/google/refresh` — read from Google

Reads what only Google can supply. **Changes nothing on Google.**

| It fills | Where it shows up |
|---|---|
| Attributes Google offers this listing | `attributes.definitions` |
| The answers the listing holds | `attributes.values` |
| The listing's photos | `media` |
| Ready-made services for its categories | `services.google_types` |
| The listing's Maps id | `info.cid` |
| Categories — **only if the location has none** | `info` |
| Name and description — **only for a non-main location that has none** | `info` |
| Social links — **only for a non-main location that has none** | `social` |

**Request body**

| Field | Type | Required |
|---|---|---|
| `location_id` | int | no |

```json
{ "location_id": 1 }
```

**Response `200`** — the **whole profile**, the same shape as `GET /profile`,
plus `meta.refresh`:

```json
{
  "data": {
    "info": {}, "address": {}, "hours": {}, "social": {},
    "attributes": {}, "services": {}, "media": {}
  },
  "meta": {
    "exists": true,
    "location": { "id": 1, "name": "…", "address": "…", "is_primary": true },
    "locations": [],
    "reviews": null,
    "google": { "connected": true, "mapped": true, "refreshed_at": "2026-10-12 06:50:02", "…": "" },
    "limits": { "description": 750, "additional_categories": 9 },
    "refresh": {
      "categories": false,
      "details": false,
      "social": false,
      "service_types": 28,
      "attributes": 42,
      "answers": 26,
      "photos": 15,
      "failed": []
    }
  }
}
```

Replace your cached profile with this response.

| `refresh` field | Type | Meaning |
|---|---|---|
| `categories` | bool | `true` = categories were filled in (the location had none) |
| `details` | bool | `true` = a non-main location's empty name or description was filled in |
| `social` | bool | `true` = a non-main location with no links of its own was given its listing's |
| `service_types` | int \| null | Ready-made services found |
| `attributes` | int \| null | Attributes Google offers |
| `answers` | int \| null | Attribute answers stored |
| `photos` | int \| null | Photos found |
| `failed` | string[] | Parts Google refused: `attributes`, `answers`, `photos`. The rest are still stored. |

`null` means that part was not read.

**When to call it**

| When | Condition |
|---|---|
| The screen opens | `meta.google.mapped === true` **and** `meta.google.refreshed_at === null` |
| Right after switching location | once the new location has loaded, if it is `mapped` |
| **Refresh from Google** button | on press |

Once per arrival — guard it so a re-render cannot fire it twice. Not while
there are unsaved edits. Never on a timer: each call spends a Google quota
shared by every site.

It never overwrites what the user typed: an attribute with `is_dirty: true`
is kept, and a category already set is left alone.

**Errors**

| Status | Code | When |
|---|---|---|
| `409` | `fhint_google_not_connected` | Not signed in |
| `409` | `fhint_google_not_mapped` | This location has no Google listing |
| `502` | `fhint_google_request_failed` | Google refused every part |

```json
{
  "code": "fhint_google_not_mapped",
  "message": "Choose which Google Business Profile this location is before publishing.",
  "data": { "status": 409 }
}
```

---

### 7.2 `POST /profile/media` — keep a chosen photo

Stores the file on this site as **waiting**. **Nothing is sent to Google.**

**Request** — `multipart/form-data`, not JSON

| Form field | Type | Required | Value |
|---|---|---|---|
| `file` | File | yes | JPG or PNG |
| `role` | string | no | `logo` · `cover` · `gallery` (default `gallery`) |
| `location_id` | int | no | |

```js
const body = new FormData();

body.append("file", file); // a File from <input type="file">
body.append("role", "gallery");
body.append("location_id", "1");

await fetch(`${rest_url}/profile/media`, {
  method: "POST",
  headers: { "X-WP-Nonce": rest_nonce }, // no Content-Type
  credentials: "same-origin",
  body,
});
```

**Response `200`** — the whole profile, plus `meta.photo` (the new photo's
id). The photo is in `data.media.pending`:

```json
{
  "data": {
    "media": {
      "logo": null,
      "cover": null,
      "gallery": [],
      "pending": [
        {
          "id": 16, "location_id": 1, "role": "gallery", "source": "owner", "state": "pending",
          "attachment_id": 42,
          "url": "http://localhost:8100/wp-content/uploads/2026/10/shopfront.jpg",
          "google_name": "",
          "mime_type": "image/jpeg", "file_size": 141883, "width": 500, "height": 500,
          "error": "", "uploaded_at": null, "synced_at": null
        }
      ],
      "location_id": 1,
      "count": 0
    }
  },
  "meta": { "photo": 16 }
}
```

(`data` also holds the other six sections, and `meta` the usual fields.)

**Photo fields**

| Field | Meaning |
|---|---|
| `id` | Use in the publish and delete endpoints |
| `role` | `logo` · `cover` · `gallery` |
| `state` | `pending` (waiting) · `uploading` · `failed` · `synced` (on Google) |
| `url` | Where to show it from |
| `error` | Google's own words when `state` is `failed` |
| `attachment_id` | The media-library file; `0` for a photo that only exists on Google |

**Validation error `400`**

```json
{
  "code": "fhint_validation_failed",
  "message": "Some of the submitted values are not valid.",
  "data": { "status": 400, "fields": { "file": ["media.type.unsupported"] } }
}
```

| Code | Meaning |
|---|---|
| `media.type.unsupported` | Not a JPG or PNG |
| `media.size.too_large` | Over 5 MB |
| `media.size.too_small` | Under 10 KB |
| `media.dimensions.too_small` | Under 250 px on a side |

Also `400 fhint_media_no_file` when no file arrived.

**Notes**

- One file per request. For several files, loop and await each.
- Choosing a second `logo` or `cover` replaces the one that was waiting.
- Use `accept="image/jpeg,image/png"` on the file input.

---

### 7.3 `POST /profile/media/{id}/publish` — send one photo to Google

**This writes to the public Google listing.** Call it only when the user
presses **Upload to Google**.

**Request**

```
POST /profile/media/16/publish
```

```json
{ "location_id": 1 }
```

**Response `200`** — the whole profile; `meta.photo` is the photo's id. The
photo has left `pending` and is now `synced`:

```json
{
  "data": {
    "media": {
      "logo": null,
      "cover": null,
      "gallery": [
        {
          "id": 16, "location_id": 1, "role": "gallery", "source": "owner", "state": "synced",
          "attachment_id": 42,
          "url": "https://lh3.googleusercontent.com/sent-photo",
          "google_name": "accounts/105451349307150237346/locations/14430845320964201281/media/AF1QipNew",
          "mime_type": "image/jpeg", "file_size": 141883, "width": 500, "height": 500,
          "error": "", "uploaded_at": "2026-10-12 06:55:40", "synced_at": "2026-10-12 06:55:40"
        }
      ],
      "pending": [],
      "location_id": 1,
      "count": 1
    }
  },
  "meta": { "photo": 16 }
}
```

**Errors**

| Status | Code | When |
|---|---|---|
| `404` | `fhint_media_not_found` | Not this location's photo |
| `409` | `fhint_media_already_sent` | Already on Google |
| `409` | `fhint_media_file_missing` | The file is gone from the media library |
| `409` | `fhint_google_not_connected` / `fhint_google_not_mapped` | No listing to send to |
| `502` | `fhint_google_request_failed` | Google refused it |

After a `502` the photo stays in `pending` with `"state": "failed"` and
Google's reason in `"error"`. The error response does not include the
profile, so refetch `GET /profile` to show the reason.

**Several photos:** loop, one request each, awaiting each.

```js
for (const photo of pending) {
  setSending(photo.id);

  try {
    await publishPhoto({ id: photo.id, locationId }).unwrap();
  } catch {
    failed += 1;
  }
}

if (failed) {
  refetchProfile();
}
```

---

### 7.4 `DELETE /profile/media/{id}` — remove a waiting photo

Removes a photo that has **not** been sent, and deletes its file.

**Request**

```
DELETE /profile/media/16
DELETE /profile/media/16?location_id=1
```

No body. `location_id` goes in the query string (use `withQuery()`).

**Response `200`** — the whole profile, with the photo gone from
`data.media.pending`.

**Errors**

| Status | Code | When |
|---|---|---|
| `404` | `fhint_media_not_found` | Not this location's photo |
| `409` | `fhint_media_on_google` | Already on Google — it cannot be removed from here |

```json
{
  "code": "fhint_media_on_google",
  "message": "This photo is on Google. Remove it from your Google Business Profile.",
  "data": { "status": 409 }
}
```

---

### 7.5 Showing photos

Google serves photos at full camera size. For a `googleusercontent.com`
address, replace any trailing `=…` with a size:

```js
const thumb = (url, size = 400) =>
  /^https:\/\/lh\d+\.googleusercontent\.com\//.test(url)
    ? `${url.replace(/=[^/=]*$/, "")}=w${size}-h${size}-c`
    : url;
```

Use `loading="lazy"` and `referrerPolicy="no-referrer"` on the `<img>`.

| Where | What it holds |
|---|---|
| `media.logo`, `media.cover` | One photo or `null` — what is on Google |
| `media.gallery` | Photos on Google |
| `media.pending` | Everything not on Google yet: `pending`, `uploading`, `failed` — including a waiting logo or cover (check `role`) |

---

## 8. Send to Google

Saving never sends anything to Google. Sending is always two stages:
**plan** (what would be sent), then **step** (send it), one request per step.

Disable **Send to Google** while there are unsaved changes — the plan is
made from what is saved, not from what is on screen.

### 8.1 `POST /profile/publish/plan` — what would be sent

Reads the listing and compares it with what is saved. **Sends nothing.**

**Request body**

| Field | Type | Required |
|---|---|---|
| `location_id` | int | no |

```json
{ "location_id": 1 }
```

**Response `200`**

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
        "fields": [
          { "field": "social.facebook", "from": "", "to": "https://facebook.com/example" },
          { "field": "attribute.has_delivery", "from": "true", "to": "false" }
        ],
        "mask": ["attributes/url_facebook", "attributes/has_delivery"],
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
      "location": "locations/14430845320964201281",
      "title": "Shokher Tola 80Tk – Pet Shop Mirpur-12",
      "maps_url": "https://maps.google.com/maps?cid=9451307654072888532",
      "read_at": "2026-10-12 06:58:11"
    }
  }
}
```

| Field | Use |
|---|---|
| `steps` | One per request to make, in order. **`[]` = Google already has everything** — say so, offer only Close. |
| `steps[].id` | `location` or `attributes` |
| `steps[].fields` | What changes: `field`, `from` (Google's), `to` (this site's) |
| `steps[].token` | **Send it back** with the step |
| `skipped` | Fields that will not be sent, with the reason. Show them. |
| `unchanged` | Fields Google already has |
| `requests` | How many steps |

Field ids: `name`, `description`, `website`, `phone`, `categories`, `hours`,
`special_hours`, `services`, `social.<network>`, `attribute.<id>`.

| `skipped[].reason` | Tell the user |
|---|---|
| `empty_here` | Empty here, so Google keeps what it has. FoundHint never clears a field on Google. |
| `no_google_id` | The category was typed by hand; choose it from the list to send it. |
| `not_allowed` | Google does not let this listing change it. |
| `not_on_google` | Google has no place for it (a Yelp link). |

**Errors:** `409 fhint_google_not_connected`, `409 fhint_google_not_mapped`,
`409 fhint_business_required`, `502 fhint_google_request_failed`.

---

### 8.2 `POST /profile/publish/step` — send one step

**This is the only endpoint that changes business details on Google.** Call
it only on an explicit press of **Send to Google**.

**Request body**

| Field | Type | Required | Value |
|---|---|---|---|
| `step` | string | yes | `location` or `attributes` |
| `token` | string | yes | That step's `token` from the plan (32 hex characters) |
| `location_id` | int | no | |
| `validate_only` | bool | no | `true` = Google checks it and saves nothing. `location` step only. |

```json
{
  "step": "location",
  "token": "97e86571c847cb64d4c72ed5c65e58a2",
  "location_id": 1
}
```

**Response `200`**

```json
{
  "data": {
    "step": "location",
    "ok": true,
    "validate_only": false,
    "fields": ["description", "hours"],
    "pushed_at": "2026-10-12 06:59:30"
  }
}
```

**Errors**

| Status | Code | Do |
|---|---|---|
| `409` | `fhint_publish_stale` | Something changed since the plan. Offer **Check again** (run the plan again). Do not retry with the old token. |
| `409` | `fhint_publish_nothing_to_send` | Google already has this step. Treat as done. |
| `400` | `fhint_google_rejected` | Google refused a value. Nothing changed. Show it on the field. |
| `400` | `fhint_validate_only_unsupported` | `validate_only` on the `attributes` step |
| `502` | `fhint_google_request_failed` / `fhint_google_unreachable` | Offer **Try again** |

Refused value — keyed by the plan's field ids:

```json
{
  "code": "fhint_google_rejected",
  "message": "Google did not accept some of these values. Nothing was changed on your listing.",
  "data": {
    "status": 400,
    "step": "location",
    "fields": { "description": ["google.profile_description_contains_url"] }
  }
}
```

Codes: `google.profile_description_contains_url`, `google.string_too_long`,
`google.invalid_category`, `google.invalid_url`, `google.invalid_value`.
When Google blames no field, the key is the step id (`location`).

**Running the steps** — in order, one at a time:

```js
for (const step of plan.steps) {
  setProgress(step.id, "sending");

  try {
    await runStep({ step: step.id, token: step.token, locationId }).unwrap();
    setProgress(step.id, "done");
  } catch (error) {
    setProgress(step.id, "failed");
    setFailure({ step: step.id, error });
    break;
  }
}

refetchProfile(); // pushed_at and is_dirty are now current
```

Show each step as *Waiting*, *Sending…*, *Sent* or *Not sent*. Google refuses
edits fired together, so never run the steps in parallel.

---

## 9. Switching location

Every endpoint in this guide accepts **`location_id`**. Left out or `0` means
the main location, so a single-location site never sends it.

**Where to put it**

| Endpoint | Where |
|---|---|
| `GET /profile` | query string |
| `PATCH /profile` | body |
| `POST /profile/google/refresh` | body |
| `POST /profile/media` | form field |
| `POST /profile/media/{id}/publish` | body |
| `DELETE /profile/media/{id}` | query string |
| `POST /profile/publish/plan` | body |
| `POST /profile/publish/step` | body |

**What changes with the location**

**Everything on the profile follows the location.** The main location uses
the business's own values; any other location keeps its own:

| Section | A non-main location with nothing of its own shows |
|---|---|
| `info.name`, `info.description`, `info.phone`, `info.website` | The business's, field by field |
| `info` categories | The business's, until it has a main category |
| `social` | The business's links, until it saves links of its own (even an empty set) |
| `services.items` | **An empty list.** Each non-main location has its own list from the start. |
| `address`, `hours`, `attributes`, `media` | Its own (always per location) |
| `services.google_types` | |
| `meta.location`, `meta.google`, `meta.reviews` | |

**What the menu lists**

Every location in `meta.locations`, plus every listing in `meta.listings`
whose `location_id` is `0` (on the Google account, not set up here yet). A
listing that has a location is that location — list it once. **Show the menu
when there is more than one entry**, so an account with two listings can
switch even if only one has been imported. Mark the not-yet-set-up ones.

**Choosing a listing that has no location yet** — `POST /profile/listing`

Request body:

| Field | Type | Required | Value |
|---|---|---|---|
| `location_name` | string | yes | The listing's `location_name` from `meta.listings` |

```json
{ "location_name": "locations/495652196029249217" }
```

Response `200`:

```json
{
  "data": {
    "location_id": 2,
    "created": true,
    "imported": ["name", "description", "address", "coordinates", "hours", "phone", "website", "categories", "social", "services"]
  }
}
```

| Field | Meaning |
|---|---|
| `location_id` | The location to switch to |
| `created` | `true` = a new location was made; `false` = the listing already had one |
| `imported` | What was brought across from Google |

It creates a **new** location named after the listing, links the listing to
it, and imports **that listing's own details** onto the new location: name,
description, address, map pin, hours, phone, website, categories, social
links and services. The business's own values are **not touched**. Calling it again for the same listing
returns the same location.

Errors: `404 fhint_import_unknown_profile` (not a listing this site has
read), `409 fhint_business_required`, `500 fhint_save_failed`. Show the
`message` next to the switcher.

Then continue with step 3 below, using the returned `location_id`.

**Steps**

1. Build the menu as above.
2. Keep the choice in the address: `#/business?location=2`. No value = main
   location. A reload then opens the same one.
3. If there are unsaved edits, ask before switching, then discard them —
   edits belong to the location they were made on.
4. `GET /profile?location_id=2`. Cache per location id, and **do not show the
   previous location's data while the new one loads** (in RTK Query use
   `currentData`, not `data`).
5. When it has loaded and `meta.google.mapped` is `true`, call
   `POST /profile/google/refresh` once.

Unknown id:

```json
{
  "code": "fhint_location_not_found",
  "message": "That location no longer exists.",
  "data": { "status": 404 }
}
```

---

## 10. Error codes used across this screen

| Status | Code | Meaning |
|---|---|---|
| `401` | `fhint_not_logged_in` | Session expired — ask the user to reload and sign in |
| `403` | `fhint_forbidden` | No permission |
| `400` | `rest_invalid_param` | A parameter failed the route's schema. `data.params` holds ready sentences keyed by parameter. |
| `400` | `fhint_validation_failed` | A value failed the rules. `data.fields` holds machine codes. |
| `404` | `fhint_location_not_found` | `location_id` does not exist |
| `409` | `fhint_business_required` | No business yet |
| `409` | `fhint_google_not_connected` | Not signed in to Google |
| `409` | `fhint_google_not_mapped` | This location has no Google listing |
| `500` | `fhint_save_failed` | The database write failed |
| `502` | `fhint_google_request_failed` | Google refused or is over quota. `message` explains. |
| `502` | `fhint_google_unreachable` | Google could not be reached |

A form must handle **both** validation shapes: `data.fields` (codes) and
`data.params` (sentences). `fieldErrors(error)` handles both. For a code you
do not recognise, show `message` — it is written for the user.

---

## 11. Rules

1. **Saving never sends to Google.** Only `POST /profile/publish/step` and
   `POST /profile/media/{id}/publish` do, and only on an explicit press.
2. **Three writes replace a whole list:** `opening_hours`, `special_hours`
   and `services.items`. Leave something out and it is gone. Everything else
   is partial.
3. **"Not set" is not "closed".** Do not send a day nobody touched.
4. **`null` is not `false`** for an attribute. `null` withdraws the answer;
   `false` publishes "no". Use `allows_false` to choose.
5. **`0` is a real coordinate.** Test latitude and longitude for `null`.
6. **Send category ids** (`gcid:pet_store`), never names.
7. **One at a time, never in parallel:** section saves, photo uploads,
   publish steps.
8. **Never hard-code the attribute list or the Google service list.** Both
   come from Google for that one listing.
9. **`google.mapped`, not `google.connected`,** decides whether Google
   actions are offered for the location on screen.
10. **Timestamps are UTC** — append `Z` before parsing.
11. **`withQuery()` for query strings; no `Content-Type` on the upload.**
12. **Every string through `__()`** with the `foundhint-local-seo` text
    domain, and never show status by colour alone.
