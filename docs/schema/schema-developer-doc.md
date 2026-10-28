# Final - FoundHint Schema Management — Developer Documentation

Oct 15, 2026 · @Miraj

## 1. Overview

Schema Management is one connected system that builds a single JSON-LD entity graph from structured plugin data and prints it into the pages the user picks. It lives at **FoundHint → Schema** and is split into five tabs: Business schema, Location schema, Service schema, Website structure, and Settings.

Each module answers one question:

| Tab | Answers | Main Schema.org output |
| --- | --- | --- |
| 01 Business schema | Who the business is | `Organization` or a `LocalBusiness` subtype (e.g. `Dentist`) |
| 02 Location schema | Where each branch operates | One `LocalBusiness` subtype per branch, linked to the parent |
| 03 Service schema | What is offered, by whom, where | `Service` with `provider`, `areaServed`, `offers` |
| 04 Website structure | How the site and pages connect | `WebSite`, `WebPage`, `AboutPage`, `ContactPage`, `BreadcrumbList` |
| 05 Settings | Where and how output is printed, and conflicts | Output placement, page map, SEO-plugin compatibility |

**Design principles the build must keep:**

- One source of truth. Name, phone, address and hours are stored once and referenced everywhere by `@id`.
- A connected Google Business Profile is required. Business data comes from the FoundHint Business Profile page (already synced with GBP); every value shows its source and can be overridden for schema.
- Never publish placeholder, invented or unconfirmed data. Missing optional data is omitted, not guessed.
- Never silently disable another plugin's schema. Detect, explain, and let the user choose the owner.
- Validation happens in Google's tools. FoundHint links straight to them and makes each reported error easy to fix in the field it came from.

### Plan limits

| Capability | Free | Pro |
| --- | --- | --- |
| Business schema | Single business | Multi-location brand management |
| Locations | See open issue 13.1 (UI says unlimited, spec says one) | Multiple branches |
| Services | Up to 5 | Expanded |
| Service ↔ branch relationships | Configured location only | Full branch-to-service mapping |
| JSON-LD preview, Test with Google | Included | Included |
| SEO plugin duplicate detection | Basic | Expanded checks and guidance |

Free output must be as valid as Pro output. Limits restrict how much the user can configure, never the correctness of what is printed.

## 2. Architecture

All five tabs read and write one central entity store; the frontend renderer turns that store into one `@graph` per request. Modules never hold their own copies of name, phone or address.

### 2.1 Entity graph

- `WebSite` → `publisher` → the main business entity (`Organization` or `LocalBusiness` subtype).
- Each branch (`LocalBusiness` subtype) → `parentOrganization` → main business.
- Each `Service` → `provider` → main business or a branch (never a new business node).
- Each `WebPage` → `isPartOf` → `WebSite`; `about` / `mainEntity` → the entity the page is about (branch, service, or business).
- `BreadcrumbList` → referenced from its `WebPage` via `breadcrumb`.

&#91;embedded content: entity graph · arrows are @id references\]

Arrows are `@id` references in the JSON-LD; no node repeats another node's name, phone or address.

When the user picks **LocalBusiness / subtype** for a single-location business, do not also emit a separate `Organization`. In that case `publisher` points to `#business`. Emit `#organization` only when the user picks Organization, or a multi-location brand has a parent plus branches.

### 2.2 Stable @id convention

IDs are built from the canonical URL plus a fixed fragment. They must never change unless the underlying URL changes, and then all references are rewritten in one pass.

| Entity | @id pattern | Example |
| --- | --- | --- |
| Website | `{home}/#website` | `https://smiledental.example/#website` |
| Organization (parent brand) | `{home}/#organization` | `https://smiledental.example/#organization` |
| Main business | `{home}/#business` | `https://smiledental.example/#business` |
| Branch | `{branch_page_url}#location` | `https://smiledental.example/gulshan/#location` |
| Service | `{service_page_url}#service-{slug}` | `https://smiledental.example/services/braces/#service-braces` |
| Page | `{canonical_url}#webpage` | `https://smiledental.example/about/#webpage` |
| Breadcrumb | `{canonical_url}#breadcrumb` | `https://smiledental.example/about/#breadcrumb` |

Two rules make IDs safe:

1. A branch with no page URL falls back to `{home}/#location-{branch_code or id}`.
2. A service always includes its slug in the fragment, so two services on the same page (e.g. Root canal and Emergency dental care) never collide.

Store the generated `@id` on the record (`schema_id` column) the first time it is built. Recompute only on an explicit URL change, then run the reference rewrite.

### 2.3 Field provenance (Google vs manual)

Schema never calls the GBP API itself. It reads the values the **Business Profile** module already stores from its Google sync, through that module's repository. The `gbp.*` captions under each field name the Business Profile field the value came from. When Business Profile re-syncs, it fires an action that Schema listens to, so schema fields refresh without a second sync.

Every field that can come from GBP carries provenance. This drives the **From Google** badge, the **Edit** link, the `gbp.*` caption under the input, and the "15 of 21 fields from Google" counter.

| State | UI | Sync behaviour |
| --- | --- | --- |
| `google` | Read-only input, From Google badge, Edit link | Overwritten on every GBP sync |
| `override` | Editable input, badge removed, "Reset to Google" action | Never overwritten; sync stores the new Google value for a diff warning |
| `manual` | Editable input, no badge | Not touched by sync |
| `google_readonly` | No Edit link (e.g. opening hours on branches) | Always mirrors Google; UI says to change it on the Business Profile |

When an overridden value differs from the latest Google value, show an inline note on that field ("Your website and Google disagree on phone"). NAP consistency is a ranking signal, so the note offers Reset to Google.

**Google connection is required.** Until the site has a connected Business Profile, the Schema page shows only a connect screen ("Connect your Google Business Profile to set up schema") with the **Connect Google** button, and nothing is printed. If the connection drops later, keep printing the last saved schema, show a red "Google disconnected" pill and banner, and pause syncing until the user reconnects. Fields the user typed or overrode are never lost.

## 3. Data model and storage

Use custom tables for records with relationships (branches, services, page assignments) and a single option for global settings. This matches the `wp_foundhint_*` table convention already used by the citation database. Before creating tables, check whether the existing **Locations** and **Services** sidebar modules already store these records; if they do, Schema must reference them, not duplicate them.

### 3.1 Tables

| Table | Key columns | Notes |
| --- | --- | --- |
| `wp_foundhint_schema_business` | `id`, `schema_kind` (organization / localbusiness), `schema_type` (e.g. Dentist), `fields` JSON, `provenance` JSON, `schema_id`, `status`, `updated_at` | One row in Free. `fields` holds name, url, telephone, logo, images, priceRange, description, address, geo, hasMap, hours, areaServed, sameAs, type-specific extras |
| `wp_foundhint_schema_locations` | `id`, `business_id`, `name`, `branch_code`, `gbp_location_id`, `fields` JSON, `provenance` JSON, `page_id`, `schema_id`, `status` (draft / active / inactive), `deleted_at` | Soft delete only. Deactivating removes output, keeps data |
| `wp_foundhint_schema_services` | `id`, `name`, `description`, `service_type`, `image_id`, `status`, `provider_kind` (business / location), `provider_id`, `person_name`, `person_type`, `page_id`, `page_url`, `offer` JSON, `source` (google / manual), `schema_id`, `sort` | `offer` = {model: none / fixed / starting\_at / range, price, min, max, currency} |
| `wp_foundhint_schema_service_areas` | `service_id`, `location_id` (nullable), `name`, `area_type` (City / AdministrativeArea / Place / Country), `source` | Per-branch areas when `location_id` is set |
| `wp_foundhint_schema_assignments` | `entity_kind`, `entity_id`, `mode` (every\_page / home\_only / chosen / own\_page), `post_ids` JSON | Drives "Add … schema to" on every tab |

### 3.2 Option `foundhint_schema_settings`

```json
{
  "enabled": true,
  "placement": "head",
  "website": { "enabled": true, "name_source": "google", "name": "Smile Dental", "alternate_name": "" },
  "webpage": { "enabled": true },
  "about_page": { "enabled": true, "post_id": 12 },
  "contact_page": { "enabled": true, "post_id": 14 },
  "breadcrumbs": { "enabled": true, "source": "foundhint" },
  "owners": { "WebSite": "foundhint", "BreadcrumbList": "yoast", "LocalBusiness": "foundhint" },
  "last_live_check": "2026-10-15T01:14:00+06:00"
}
```

`owners` records the user's source-of-truth choice per schema type (section 9.4). The renderer skips any type whose owner is not `foundhint`.

### 3.3 Uninstall and disable

- Turning **Add to my site header** off stops all output immediately and keeps every record.
- Uninstall deletes only `wp_foundhint_schema_*` tables and `foundhint_schema_*` options, behind the plugin's existing "delete data on uninstall" setting.
- Never touch other plugins' options, meta, or output.

## 4. Screen shell (shared by all tabs)

Every tab uses the same frame: page header, a five-step tab bar, a form column on the left, and a sticky JSON-LD preview on the right (Settings has no preview).

### 4.1 Page header

| Element | Behaviour |
| --- | --- |
| Breadcrumb "FoundHint / Schema" + info icon | Info icon opens a short plain-language explainer of structured data |
| Google connection pill | "Google not connected" (grey) or "Connected as …" (green). Drives whether From Google fields exist |
| Connect Google | Links to the existing Business Profile connection flow (Google Business Profile → Connection). Required before any schema can be set up; hidden when connected |
| Upgrade to Pro | Hidden on Pro |
| Location context bar (name, address, rating, Switch location) | Must reflect the location being edited. See issue 13.2 |

### 4.2 Tab bar

Each tab shows a number, a title, and a live one-line summary computed from stored data. The active tab has an orange underline.

| Tab | Summary line logic | Example |
| --- | --- | --- |
| 01 Business schema | `{schema_type} · {assignment label}` | Dentist · every page |
| 02 Location schema | `{n active branches} branches · {n distinct pages} pages` | 2 branches · 3 pages |
| 03 Service schema | "Unsaved changes" if the tab has a dirty draft, else `{n} active` | Unsaved changes |
| 04 Website structure | `{n enabled} of 5 on` | 5 of 5 on |
| 05 Settings | "Added to site header" / "Added before \</body>" / "Output off" | Added to site header |

Switching tabs with unsaved changes prompts "Save, discard, or stay".

### 4.3 JSON-LD preview panel

- Header: green dot (live) / grey (draft or not published), title "JSON-LD preview", a chip showing the root `@type` (e.g. `@type: Dentist`, `@type: Service`, `@type: @graph`), and a property count.
- Body: the exact `<script type="application/ld+json">` the renderer would print for this entity, pretty-printed and syntax-coloured. It is produced by the same server-side builder as the frontend (REST call), never a separate JS template.
- Updates live while editing (debounced 400 ms) from the unsaved draft.
- **Copy schema** copies the JSON to the clipboard and shows a toast.
- **Test with Google** opens Google's Rich Results Test for the assigned page URL. It cannot submit unsaved drafts; when the draft differs from what is live, show "Save first to test the live page".
- Property count = number of leaf properties in the rendered object, excluding `@context`.

### 4.4 Save and publish states

| State | Footer text | Button |
| --- | --- | --- |
| Clean, live | ● Saved and live on your site. | Save and publish (disabled) |
| Dirty | ● You have unsaved changes. (amber) | Save and publish (enabled) |
| Saving | Saving… | Spinner |

Incomplete records can always be saved as **draft** (status `draft`), which stores data but prints nothing. Only missing required fields keep an entity in draft; warnings never block publishing.

## 5. Module 01 — Business schema

Business schema creates the one main business entity (`#business` or `#organization`) that every other module references. Header badge: "{n} of {m} fields from Google" (e.g. 15 of 21).

### 5.1 Schema type

Two radio cards:

| Card | Tag | Meaning | Hides |
| --- | --- | --- | --- |
| Organization | Business-wide | Overall company or brand; no address or hours needed | Address, Hours and reach, type-specific details |
| LocalBusiness / subtype | Location-specific | Customers visit or are served in a local area | Nothing |

Default: LocalBusiness, since every site has a connected Business Profile. Organization is for a brand-level entity above branches. Switching type keeps all field values; hidden fields are simply not emitted.

### 5.2 Business subtype (required for LocalBusiness)

- Searchable select with a friendly label and the Schema.org type as a chip ("Dental practice" → `Dentist`).
- Pre-selected by mapping the GBP primary category through `gbp_category_map.json` (already in the citation database). Helper text: "Matched from your Google category: Dental clinic."
- The list is a curated, versioned file `schema_types.json` of local-relevant types only (Plumber, Restaurant, Dentist, MedicalClinic, Store, LegalService, RealEstateAgent, AutoRepair, BeautySalon, Electrician, GeneralContractor, VeterinaryCare, …). Each entry stores its parent type so "Not on the list? Pick the closest parent type" works.
- Each type can declare extra fields (5.6).

### 5.3 Eligibility banner

Green banner when business name and a physical address (or service area for SABs) are present: "Eligible for Google's local business result." Amber when either is missing, naming the field. The banner checks Google's documented required properties only; it does not promise a rich result.

### 5.4 Fields

Badges: **Required by Google**, **Required by Google for a storefront**, **Recommended**, **Optional**, **From Google**. Caption under each GBP field = the source path.

| Group | Field | Badge | GBP source | Schema property | Validation |
| --- | --- | --- | --- | --- | --- |
| Business information | Business name | Required by Google | `gbp.title` | `name` | 1–200 chars; warn if it differs from GBP |
|  | Business website | Recommended | `gbp.websiteUri` | `url` | Absolute HTTPS URL; warn if host differs from site host |
|  | Phone number | Recommended | `gbp.phoneNumbers.primary` | `telephone` | E.164 via `normalize_phone()` from `countries.json` |
|  | Business logo | Recommended | — (media library) | `logo` | Media picker or URL; image at least 112×112 |
|  | Business images | Optional | `gbp.media[]` | `image[]` | Picker shows "First 3 of 18 Google photos"; see issue 13.4 |
|  | Price range | Optional | — | `priceRange` | Select: `$` to `$$$$`, or free text up to 100 chars |
|  | Description | Optional | `gbp.profile.description` | `description` | Up to 750 chars, plain text, HTML stripped |
| Address | Customers visit you at | — | derived | controls address output | This address (storefront or office) / I serve customers at their location (hide street address, require Areas served) |
|  | Street address | Required for storefront | `gbp.storefrontAddress.addressLines` | `address.streetAddress` | Never invented; lines joined with ", " |
|  | City | Required for storefront | `…locality` | `address.addressLocality` |  |
|  | State or region | Required for storefront | `…administrativeArea` | `address.addressRegion` | Label from `countries.json` (State / Division / County) |
|  | Postal code | Required for storefront | `…postalCode` | `address.postalCode` | Format per country; optional where the country has none |
|  | Country | Required for storefront | `…regionCode` | `address.addressCountry` | ISO 3166-1 alpha-2 |
|  | Latitude / Longitude | Optional | `gbp.latlng` | `geo` | −90 to 90 / −180 to 180, at least 4 decimals; warn if over 1 km from the geocoded address |
|  | Map URL | Optional | `gbp.metadata.mapsUri` | `hasMap` | Must be a Google Maps URL |
| Hours and reach | Opening hours | Recommended | `gbp.regularHours` | `openingHoursSpecification` | See 6.4 |
|  | Areas served | Optional | `gbp.serviceArea.places` | `areaServed` | Comma-separated; each becomes a `Place` or `City` |
|  | Social profiles | Optional | — | `sameAs[]` | One HTTPS URL per line; dedupe; drop the site's own URL |

### 5.5 Assignment: "Add business schema to"

Three radio cards: **Every page** (default, "Site-wide, all 32 pages"), **Home page only**, **Pages I choose** (page chips). The count is published, indexable posts and pages.

If the user picks Pages I choose and excludes Home, warn that the home page needs the business node so `WebSite.publisher` resolves.

### 5.6 Type-specific details

A section titled "Details for {type label}" appears when the subtype declares extras. For Dentist:

| Field | Schema property | Values |
| --- | --- | --- |
| Accepting new patients | `isAcceptingNewPatients` | Yes / No / Not set |
| Medical specialty | `medicalSpecialty` | Enum from `MedicalSpecialty` (Dentistry, …) |

Other types declare their own (e.g. Restaurant: `servesCuisine`, `menu`, `acceptsReservations`). Extras are defined in `schema_types.json`, not hardcoded in PHP.

### 5.7 Example output

```json
{
  "@type": "Dentist",
  "@id": "https://smiledental.example/#business",
  "name": "Smile Dental",
  "url": "https://smiledental.example/",
  "telephone": "+880-9612-345670",
  "logo": "https://smiledental.example/wp-content/uploads/logo.png",
  "priceRange": "$$",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "House 22, Road 90, Gulshan 2",
    "addressLocality": "Dhaka",
    "addressRegion": "Dhaka Division",
    "postalCode": "1212",
    "addressCountry": "BD"
  },
  "geo": { "@type": "GeoCoordinates", "latitude": 23.7925, "longitude": 90.4078 },
  "sameAs": ["https://facebook.com/smiledentalbd", "https://instagram.com/smiledentalbd"],
  "isAcceptingNewPatients": true
}
```

## 6. Module 02 — Location schema

Location schema emits one entity per active branch, typed with the business subtype (e.g. `Dentist`, not plain `LocalBusiness`) and linked to the main business with `parentOrganization`. Header badge: "{n} of {m} fields from Google" (e.g. 10 of 13).

### 6.1 Branch selector

Pill buttons, one per branch, showing name and "On {n} pages". The selected branch has an orange outline. Branches are created and deleted on the **Locations** module; this tab only edits their schema. Deactivated branches show a muted pill with "Off".

When the business has one location, hide the selector and treat that location as the main business (no separate branch entity).

### 6.2 Fields

| Field | GBP source | Schema property | Notes |
| --- | --- | --- | --- |
| Branch name | `gbp.title` | `name` | Required |
| Branch code | `gbp.storeCode` | `branchCode` | Optional; also used in fallback `@id` |
| Street address | `gbp.storefrontAddress.addressLines` | `address.streetAddress` | Required for a storefront branch |
| City | `…locality` | `address.addressLocality` | Required |
| Postal code | `…postalCode` | `address.postalCode` | Conditional on country |
| Country | `…regionCode` | `address.addressCountry` | Required |
| Region | `…administrativeArea` | `address.addressRegion` | Add to UI (issue 13.6) |
| Latitude / Longitude | `gbp.latlng` | `geo` | Same validation as 5.4 |
| Phone | `gbp.phoneNumbers.primary` | `telephone` | Branch number, not the head office |
| Email | — (manual) | `email` | Public address only; validated with `is_email()` |
| Branch page URL | `gbp.websiteUri` | `url` | Prefer the canonical location page; warn if it is the home page |
| Map URL | `gbp.metadata.mapsUri` | `hasMap` | Not shown in UI today but emitted; add a field |
| Part of | — | `parentOrganization` | Select of the main business; links by `@id` |
| Sister branches | — | none (display only) | Read-only chips of other branches with the same parent |
| Opening hours | `gbp.regularHours` | `openingHoursSpecification` | `google_readonly`; "Change these on your Business Profile and they update here." |

Shared fields (logo, image, priceRange, sameAs, description) are inherited from the main business unless the branch overrides them. Inherit at render time; do not copy into the branch row.

### 6.3 Assignment: "Add {branch} location schema to"

Same three cards as 5.5 (Every page / Home page only / Pages I choose). Default for a branch is **Pages I choose**, pre-selecting the branch's own page and the Contact page. The tab summary ("3 pages") counts distinct pages across all branches.

Warn when a branch is assigned to Every page in a multi-branch setup: every page would claim every branch.

### 6.4 Opening hours rules

The editor (for manual businesses) and the GBP mapper both produce the same internal structure:

```json
{ "mon": [["10:00","21:00"]], "fri": "closed", "sat": [["10:00","14:00"],["16:00","21:00"]], "sun": "24h" }
```

| Case | Output |
| --- | --- |
| Same hours on several days | One `OpeningHoursSpecification` with `dayOfWeek` array |
| Split day (two intervals) | One spec per interval |
| Closed day | Omit the day. Do not emit `00:00–00:00` |
| Open 24 hours | `opens` `00:00`, `closes` `23:59` |
| Overnight (e.g. 22:00–02:00) | `opens 22:00`, `closes 02:00` on the start day |
| Unknown / not set | Omit `openingHoursSpecification` entirely. Never assume 24 hours |
| Special hours (holidays) from GBP `specialHours` | Spec with `validFrom` / `validThrough`, only for future dates within 90 days |

Times are local to the branch; Schema.org has no time-zone field, so store the branch time zone only for the editor and GBP sync.

### 6.5 Example output

```json
{
  "@type": "Dentist",
  "@id": "https://smiledental.example/gulshan/#location",
  "name": "Smile Dental Gulshan",
  "branchCode": "SD-GUL",
  "url": "https://smiledental.example/gulshan/",
  "telephone": "+880-1712-345670",
  "email": "gulshan@smiledental.example",
  "address": { "@type": "PostalAddress", "streetAddress": "House 22, Road 90, Gulshan 2", "addressLocality": "Dhaka", "postalCode": "1212", "addressCountry": "BD" },
  "geo": { "@type": "GeoCoordinates", "latitude": 23.7925, "longitude": 90.4078 },
  "hasMap": "https://maps.google.com/?cid=8412093371665221840",
  "openingHoursSpecification": [{
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Saturday","Sunday"],
    "opens": "10:00", "closes": "21:00"
  }],
  "parentOrganization": { "@id": "https://smiledental.example/#business" }
}
```

## 7. Module 03 — Service schema

Service schema emits one `Service` per active service, linked to the business or branch that provides it with `provider`. It never creates a new business entity.

### 7.1 Services list

- Header: "Service schema", helper line, and **+ Add a service** (disabled at the plan limit with "5 of 5 on Free").
- Summary: "Services offered · {n} active · {n} inactive".
- Each row: name, source badge (**From Google** when imported from GBP services), issue badge ("1 to check", amber), a meta line `{category} · {provider} · {n} areas · {page title}`, status text and toggle.
- The toggle sets `status` active / inactive and saves immediately (no Save and publish needed). Inactive services print nothing and do not count toward the Free limit (confirm, issue 13.7).
- Clicking a row opens the editor below the list under a dark bar "EDITING {name}". Rows are drag-sortable; order drives output order.

### 7.2 Editor sections

**01 Service**

| Field | Rule | Schema property |
| --- | --- | --- |
| Service name | Required; From Google if imported | `name` |
| Short description | Optional, up to 300 chars; should match the page | `description` |
| Service category | Select, filtered by business subtype (Dentist → Orthodontics, Endodontics, Preventive care, Cosmetic dentistry, Emergency care…) | `serviceType` |
| Status | Active, publish it / Draft / Inactive | controls output |
| Image | Optional: No image / media library / featured image of service page | `image` |

**02 Service provider**

- Radio cards: **Main business** ("Smile Dental from Business schema") or **Specific branch** (then a branch select; multi-select on Pro).
- Specific provider (optional) + Provider is a (Person / Organization). When filled, emit the person as an additional node and link it:

```json
"provider": { "@id": "https://smiledental.example/#business" }

{
  "@type": "Person",
  "@id": "https://smiledental.example/#person-farhana-rahman",
  "name": "Dr. Farhana Rahman",
  "worksFor": { "@id": "https://smiledental.example/#business" }
}
```

Recommended modelling: keep `provider` pointing to the business or branch, and add the person via a separate `Person` node with `worksFor` → the provider's `@id`. Do not replace the business provider with a person, or the service loses its link to the local entity.

**03 Service areas**

- Chips with name, area type ("Named area", City, Region, Country) and remove ×.
- Input + type select + **Add**. Suggestions from GBP service area appear as "+ Gulshan" chips.
- Note: "Only add places you genuinely serve. A service area is not your business address, which lives in Location schema."
- Output: `areaServed` array of `Place` / `City` / `AdministrativeArea` / `Country` with `name`. Never create a `LocalBusiness` per area.
- With multiple providers on Pro, areas are stored per provider (`service_areas.location_id`).

**04 Service page**

- Segmented control: **WordPress page** (searchable select of published pages, shows title and permalink) or **Enter a URL**.
- Below: "Primary landing page: {url}".
- Page warnings (amber, non-blocking):

| Condition | Message |
| --- | --- |
| Page is general (Home, Services index, Contact) | "'Services' is a general page. A page about only this service works better." |
| Page already used by another service | "Root canal already uses this page. Each service works best on its own page." |
| Page is draft, private, or trashed | "This page isn't published, so nothing will show." |
| URL on another host | "This URL is on another site. Schema here can't describe it." |
| URL is not canonical (redirects, has query) | "This URL redirects to {canonical}. Use that instead." |

The page list marks pages already taken with "Used by {service}".

**05 Optional details** (collapsed by default)

| Pricing | Fields shown | Output |
| --- | --- | --- |
| No price | — | no `offers` |
| Fixed price | Price, Currency | `offers: { @type: Offer, price, priceCurrency }` |
| Starting at | Price, Currency | `offers: { @type: Offer, priceSpecification: { @type: PriceSpecification, minPrice, priceCurrency } }` |
| Price range | Min, Max, Currency | `priceSpecification` with `minPrice` and `maxPrice` |

Currency defaults from the business country (`countries.json`, BD → BDT). The prototype shows USD for a Dhaka business; see issue 13.5. Price must be a positive decimal; an empty price with Fixed selected is a validation error.

**Add this schema to**

Radio cards: **Its service page** (recommended, default) or **Pages I choose** (page chips). Caption "Printed only on {page}".

### 7.3 Example output

```json
{
  "@type": "Service",
  "@id": "https://smiledental.example/services/braces/#service-braces",
  "name": "Braces",
  "description": "Metal and ceramic braces with monthly reviews.",
  "serviceType": "Orthodontics",
  "provider": { "@id": "https://smiledental.example/#business" },
  "areaServed": [
    { "@type": "Place", "name": "Dhanmondi" },
    { "@type": "Place", "name": "Mohammadpur" }
  ],
  "url": "https://smiledental.example/services/braces/"
}
```

## 8. Module 04 — Website structure

Website structure emits the site-level and page-level nodes that tie every entity to real URLs. Five rows, each with a toggle, a type chip, a description, and an "Added to" target. Tab summary: "{n} of 5 on".

| Row | Type | Added to | Configurable | Rules |
| --- | --- | --- | --- | --- |
| Your website | `WebSite` | Home page | Name (from Google or site title), alternate name | `publisher` → main business `@id`. One per site. No `SearchAction` (Google retired the sitelinks search box) |
| Each page | `WebPage` | Every page | — | `name` = SEO title if an SEO plugin provides it, else post title; `description` = meta description, else excerpt; `isPartOf` → `#website`; `about` → branch/service/business when assigned; `primaryImageOfPage` = featured image; `breadcrumb` → `#breadcrumb` |
| About page | `AboutPage` | Selected page | Page select (auto-detected by slug `about`, `about-us`) | Replaces `WebPage` type on that page, same `@id`. Only when the page exists and is published |
| Contact page | `ContactPage` | Selected page | Page select (auto-detected by slug `contact`, `contact-us`) | Same as About |
| Breadcrumbs | `BreadcrumbList` | Every page except Home | Source: FoundHint or detected provider | Built from the real hierarchy (page parents; post → category). Positions start at 1. Last item may omit `item`. Never invent a parent |

Auto-detection proposes a page; the user must confirm before the type is emitted. If the selected page is later unpublished, stop emitting the type and raise an issue.

When an SEO plugin already emits one of these types, the row shows an amber note (e.g. "Yoast SEO also adds breadcrumbs. Switch theirs off to avoid two copies.") and the `owners` setting decides who prints it (9.4).

### 8.1 Example output (Home)

```json
{
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", "@id": "https://smiledental.example/#website", "name": "Smile Dental", "url": "https://smiledental.example/", "publisher": { "@id": "https://smiledental.example/#business" } },
    { "@type": "WebPage", "@id": "https://smiledental.example/#webpage", "url": "https://smiledental.example/", "name": "Smile Dental · Dentist in Dhaka", "isPartOf": { "@id": "https://smiledental.example/#website" }, "about": { "@id": "https://smiledental.example/#business" } }
  ]
}
```

## 9. Module 05 — Settings

Settings controls whether and where output is printed, shows exactly which schema lands on which page, and resolves conflicts with other plugins.

### 9.1 Add to my site header

- Master toggle with an "On" / "Off" pill. Off = renderer returns early; all data kept.
- **Where in the page**: `Inside <head> (recommended)` hooks `wp_head` (priority 20); `Before </body>` hooks `wp_footer` (priority 20). Helper: "Search engines read both. Use the second only if your theme strips extra code from the head."
- **Live status box**: green "Live on your site. Last checked {relative time}." / amber "Not found on your site" / red "Couldn't reach your site". **Check my site** runs the live check (9.5).
- **What gets added**: a read-only code panel showing the script tags that will be printed, with `…your theme's tags…` as a placeholder for existing head content.

Output format: the prototype shows four tags (`foundhint-business`, `foundhint-location`, `foundhint-services`, `foundhint-website`). Recommended: print **one** `<script type="application/ld+json" id="foundhint-schema">` holding a single `@graph`, so cross-references resolve in one document and there are no duplicate nodes. See issue 13.3.

### 9.2 What goes where

A table of every page group and the schema printed on it, computed from all assignments (same resolver the frontend uses).

- Rows: Home, About, Contact, each branch page, each service page, Blog, then "Your other {n} pages match Blog" for pages whose set is identical to a listed row.
- Cells: chips with type and, for multi-instance types, the entity name (`Service · Root canal`, `LocalBusiness · Gulshan`). Chips use the real subtype (`Dentist · Gulshan`), not `LocalBusiness` (issue 13.3).
- Clicking a chip opens that entity's tab; clicking a page row opens the rendered JSON for that page.
- Highlight in amber any page with two entities of the same type and conflicting meaning (e.g. two services on Root canal).

### 9.3 Works with your SEO plugin

Header badge: "{n} to sort out" (amber) or "All clear" (green). One row per known provider:

| Status chip | Meaning |
| --- | --- |
| Duplicate found (amber) | Active and emits a type FoundHint also emits |
| No overlap (green) | Active, emits only types FoundHint doesn't (e.g. WooCommerce `Product`) |
| Ready (grey) | Supported integration, plugin not installed |
| Integrated (green) | Both emit into one graph via the provider's filter (9.4) |

Providers to detect: Yoast SEO, Rank Math, All in One SEO, SEOPress, WooCommerce, The SEO Framework, Schema Pro, and theme output found by the live check.

For each duplicate, a fix panel gives plain steps (e.g. "In WordPress, open Yoast SEO → Settings → Site representation and switch off Local business details. Your other Yoast settings stay as they are.") and a button **I've switched it off, check again** that re-runs detection and the live check for the affected type only.

### 9.4 Source of truth per type

For every overlapping type the user picks an owner: FoundHint, the other plugin, or (when supported) Integrate. Stored in `settings.owners`.

| Choice | Behaviour |
| --- | --- |
| FoundHint owns | FoundHint prints the type; show the fix steps to turn the other plugin's copy off |
| Other plugin owns | FoundHint skips that type and references the other plugin's `@id` if detectable (e.g. Yoast `#website`) |
| Integrate | FoundHint injects its nodes into the other plugin's graph through its filter and prints no script of its own |

Candidate integration hooks (verify against current plugin versions before shipping; do not promise integration for untested versions):

- Yoast SEO: `wpseo_schema_graph_pieces`, `wpseo_schema_graph`
- Rank Math: `rank_math/json_ld`
- All in One SEO: `aioseo_schema_output`
- SEOPress: confirm available filter in its docs

Never deactivate, edit options of, or filter out another plugin's output without the user's explicit action.

### 9.5 Live check ("Check my site")

1. Fetch Home plus one page per row of 9.2 with `wp_remote_get()` (timeout 10 s, `sslverify` on, cache-busting query arg, no auth cookies).
2. Parse every `application/ld+json` block; flatten `@graph`; record `@type`, `@id` and which script `id` / plugin comment it came from.
3. Compare with what FoundHint expects for that page: found / missing / duplicated / extra.
4. Store results in `foundhint_schema_settings.last_live_check`; update "Last checked".
5. Run automatically on save (async, Action Scheduler) and daily via WP-Cron, never on frontend requests.

## 10. JSON-LD generation pipeline

One server-side builder produces the graph for both the frontend and the admin preview. The admin never assembles JSON in JavaScript.

### 10.1 Request flow

1. `wp_head` / `wp_footer` fires `FoundHint\Schema\Renderer::print()`; returns early if output is off, the request is admin, feed, REST, 404, password-protected, `noindex`, or a non-public post status.
2. `Context::from_query()` resolves the canonical URL (SEO plugin canonical if present, else `wp_get_canonical_url()`), post ID, and page role (home, about, contact, branch page, service page, other).
3. `AssignmentResolver::for_post( $post_id )` returns the list of entities assigned to this page (cached per post).
4. Each enabled `Piece` (Business, Location, Service, WebSite, WebPage, Breadcrumb) is asked `is_needed( $context )` then `generate( $context )`, returning an array node.
5. `Graph::finalize()` drops empty values, dedupes by `@id`, removes nodes whose type is owned by another plugin, and ensures every `{ "@id" }` reference resolves within the graph or is a known external `@id`.
6. Filter `foundhint_schema_graph` lets developers adjust the final array.
7. Encode once with `wp_json_encode( $graph, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG )` and print inside a single script tag.

`JSON_HEX_TAG` encodes `<` and `>`, which prevents a description containing `</script>` from breaking out of the tag.

### 10.2 Classes

| Class | Responsibility |
| --- | --- |
| `Schema\Repository\{Business,Location,Service}Repository` | CRUD, provenance, soft delete, cache invalidation |
| `Schema\Gbp\Mapper` | Reads Business Profile module data (already synced from GBP) into schema fields; respects `override` provenance |
| `Schema\IdFactory` | Builds and stores stable `@id`s; reference rewrite on URL change |
| `Schema\Pieces\*` | One class per node type, `is_needed()` + `generate()` |
| `Schema\Graph` | Assembly, dedupe, reference check, owner filtering |
| `Schema\Compat\{Yoast,RankMath,Aioseo,SeoPress}` | Detection, emitted-types map, integration filters |
| `Schema\LiveCheck` | Fetch + parse rendered pages |
| `Schema\Rest\*Controller` | Admin endpoints (section 12) |

### 10.3 Developer hooks

| Hook | Type | Purpose |
| --- | --- | --- |
| `foundhint_schema_graph` | filter | Final graph array before encoding |
| `foundhint_schema_piece_{type}` | filter | Single node after generation (e.g. `_service`) |
| `foundhint_schema_enabled` | filter | Bool; disable output per request |
| `foundhint_schema_types` | filter | Extend the curated subtype list |
| `foundhint_schema_saved` | action | After any entity save; args: kind, id |
| `foundhint_schema_id` | filter | Override `@id` construction (use with care) |

### 10.4 Rules the builder enforces

- Omit any property whose value is empty, null, placeholder, or failed validation. Never print `""` or `[]`.
- Never print example data (`example.com`, `+1 555…`) unless the user explicitly saved it.
- Print only `active` records on published, public pages. Drafts and inactive records are preview-only.
- URLs are absolute and use `home_url()`; never `localhost` or a staging host on production.
- Strip HTML from text fields with `wp_strip_all_tags()`; decode entities once.

## 11. Validation (done in Google's tools)

FoundHint does not validate schema itself. The user tests their pages with Google's tools and fixes anything reported in the FoundHint field that produced it.

### 11.1 Workflow

1. In the JSON-LD preview panel, the user clicks **Test with Google**. It opens Google's Rich Results Test in a new tab with the live page URL: `https://search.google.com/test/rich-results?url={urlencoded page URL}`.
2. Optional, not in the current UI: a second link, **Check with Schema.org**, opens the Schema Markup Validator (`https://validator.schema.org/`) for a full vocabulary check.
3. Google lists errors and warnings by property name (e.g. missing `address`, invalid `telephone`).
4. The user returns to FoundHint, finds the field, fixes it, and clicks **Save and publish**.
5. The user tests again.

To make step 4 easy, each field shows its Schema.org property name in a small caption or tooltip (e.g. Phone number → `telephone`), so a Google message maps to exactly one field.

Google's tool can only fetch public, published pages. For drafts, staging, or sites behind a login, the user clicks **Copy schema** and pastes it into the Rich Results Test's Code tab. Show this tip beside the button when the site is not publicly reachable or the entity has unsaved changes.

### 11.2 What the plugin still checks

These are input checks, not schema validation. They stop broken values from ever being printed.

- Field format on save: URL, email, phone, coordinates, times, price.
- Required fields per type (name; street, city and country for a storefront). Missing required fields keep the entity as a draft.
- Duplicate output from SEO plugins (9.3). Google's tool shows two copies but not which plugin printed each, so FoundHint names the plugin and the fix.
- Inline page warnings in Service schema (7.2), e.g. a service on a general page.

### 11.3 What the plugin does not do

No rule engine, issue list, audit history, health score, or "Passed" status. The preview dot means only live (green) or draft / not published (grey). Copy never claims the schema is valid or indexed. The one exception is the Business schema banner (5.3), which only reports that Google's required fields are filled; reword it to "Has the details Google needs for a local business result" so it doesn't read as a validation pass.

## 12. REST API, security and performance

### 12.1 Endpoints (namespace `foundhint/v1`)

| Method | Route | Purpose |
| --- | --- | --- |
| GET / PUT | `/schema/business` | Read / save business entity (`?draft=1` saves as draft) |
| GET | `/schema/locations` · `/schema/locations/{id}` | List / read branch schema |
| PUT | `/schema/locations/{id}` | Save branch schema |
| GET / POST | `/schema/services` | List / create (enforces plan limit server-side) |
| PUT / PATCH / DELETE | `/schema/services/{id}` | Save / toggle status / soft delete |
| PUT | `/schema/services/order` | Save sort order |
| GET / PUT | `/schema/website` | Website structure rows |
| GET / PUT | `/schema/settings` | Output toggle, placement, owners |
| POST | `/schema/preview` | Body: `{entity, draft}` → rendered JSON |
| GET | `/schema/page-map` | "What goes where" table |
| POST | `/schema/live-check` | Start check (async), returns job id |
| GET | `/schema/live-check/{job}` | Poll result |
| GET | `/schema/compat` | Detected providers and overlaps |
| GET | `/schema/pages?search=` | Page selector: title, permalink, status, "used by" |
| POST | `/schema/gbp/sync` | Refresh from Business Profile data into `google` fields |

### 12.2 Security

- Every route: `permission_callback` checking `manage_options` (or a dedicated `foundhint_manage_schema` capability mapped to it). REST nonce `wp_rest` via `X-WP-Nonce`.
- Sanitize on input by field type: `sanitize_text_field`, `sanitize_textarea_field`, `esc_url_raw` + scheme allowlist (`http`, `https`), `is_email`, numeric casts with range checks, enum allowlists for types, area types, pricing models, placement.
- Reject unknown Schema.org types; only types in `schema_types.json` (plus filter) are accepted.
- Escape all admin output (React escapes by default; never use `dangerouslySetInnerHTML` for user values).
- Frontend: encoding per 10.1; no user value ever concatenated into the script tag.
- Never print email, phone or address the user has not marked public, draft content, private pages, or any API token. GBP tokens stay server-side in the existing encrypted credential store.
- Live check only fetches the site's own `home_url()` host.

### 12.3 Performance

- Frontend cost target: under 2 ms and zero extra DB queries on a warm object cache.
- Cache the built graph per post in a transient / object cache key `foundhint_schema_{post_id}_{settings_version}`; bump `settings_version` on any save. Invalidate a post's key on `save_post`, `deleted_post`, `transition_post_status`.
- Assignments resolved once per save into a post → entities map, not per request.
- No remote calls, no full-site scans, and no `WP_Query` loops on frontend requests. Live checks and GBP syncs run in Action Scheduler.
- Output is in server-rendered HTML, so it works with page caching; purge known page caches (WP Rocket, LiteSpeed, W3TC hooks where present) for affected URLs after save.

## 13. Prototype issues to resolve before build

These are gaps between the shared UI and the spec or Schema.org rules. Each needs a decision before the related phase starts.

| # | Where | Issue | Recommendation |
| --- | --- | --- | --- |
| 13.1 | Sidebar footer, spec §13 | UI says "Unlimited locations · 5 services" on Free; spec says one location on Free | Pick one and update both. If unlimited, Location schema is a Free feature |
| 13.2 | Page header | Context bar shows "Northside Dental Care, Downtown, Austin TX" while all data is Smile Dental, Dhaka | Header must show the business/branch being edited |
| 13.3 | Settings → What gets added / What goes where | Four separate script tags; Contact row shows `LocalBusiness · Gulshan` while branch output is `Dentist` | One `@graph` script; chips show the real subtype |
| 13.4 | Business → images | Images point to `lh3.googleusercontent.com` URLs from GBP | Hotlinked Google URLs can expire. Offer "Import to Media Library" and emit local URLs |
| 13.5 | Service → Optional details | Currency defaults to USD for a BD business | Default from business country; BDT here |
| 13.6 | Location → fields | No Region field and no Map URL field, but business has both and branch JSON emits `hasMap` | Add both fields, From Google |
| 13.7 | Service list | Summary "5 active · 0 inactive" while the notes say Braces is inactive; Braces toggle shows Active | Fix sample data; define whether inactive services count toward the 5 limit |
| 13.8 | Website → WebSite JSON | `publisher` → `#organization`, but the business is a LocalBusiness with `@id` `#business` | Point to `#business` when no Organization exists (2.1) |
| 13.9 | Website → WebPage JSON | Home `WebPage` has no `about` | Add `about` → `#business` on Home |
| 13.10 | Spec §8 vs UI | Spec branch id `…/locations/austin/#business`; UI `…/gulshan/#location` | Adopt `#location` (2.2) and update the spec |
| 13.11 | Service → provider | "Specific provider" person could replace the business as `provider` | Keep business as provider, add `Person` with `worksFor` (7.2) |
| 13.12 | Settings → What gets added | Says "Nothing to copy or paste", while every tab has Copy schema | Keep Copy schema for debugging; fine as is, but label it "Copy JSON" to avoid implying manual install |
| 13.13 | Services list | "1 to check" badge has no visible explanation in the row | Hover/expand shows the issue message and a fix link |
| 13.14 | Business → Pages I choose | Excluding Home breaks `WebSite.publisher` | Always print the business node on Home when Website structure is on |
| 13.15 | Page header, all tabs | Every screen shows "Google not connected" and Connect Google while fields show From Google data | Connection is required, so the mockups should show the connected state; keep the disconnected state only for the connect screen and the dropped-connection banner |
| 13.16 | Every field | Captions show the GBP source path (gbp.title) but not the Schema.org property, so a Google test error is hard to map to a field | Add the property name (name, telephone) to the caption or a tooltip (11.1) |

## 14. Build phases and acceptance criteria

Build the shared foundation first; screens come after the entity model, ID factory and renderer work end to end.

### 14.1 Phases

1. **Foundation** — audit existing Locations/Services storage and current schema output; tables, repositories, `IdFactory`, `Graph`, renderer with one script tag, `foundhint_schema_graph` filter.
2. **Business schema** — type and subtype selection, GBP mapper with provenance, fields, assignment, preview endpoint.
3. **Location schema** — branch selector, branch fields, inheritance, hours engine, `parentOrganization`.
4. **Service schema** — list, editor, providers, areas, page selector with warnings, offers, plan limit.
5. **Website structure** — WebSite, WebPage, About/Contact detection, BreadcrumbList.
6. **Settings and compatibility** — placement, page map, provider detection, owners, live check, fix panels.
7. **Google testing and QA** — run every scenario through the Rich Results Test; test matrix below.

### 14.2 Acceptance checklist

**Business**

- [ ] Organization, LocalBusiness and subtypes selectable; subtype pre-filled from GBP category
- [ ] Incomplete records save as draft and print nothing
- [ ] Single-location site emits one business node, no extra Organization
- [ ] Overridden fields survive a GBP sync; mismatch raises `nap_mismatch`

**Location**

- [ ] Each branch has its own `@id`, address, geo, hours, contacts
- [ ] `parentOrganization` resolves; deactivating a branch keeps its data
- [ ] Closed days omitted; unknown hours never emitted as 24 h

**Service**

- [ ] Services link to business or branch by `@id`, no duplicate business nodes
- [ ] Two services on one page get distinct `@id`s and a `page_shared` warning
- [ ] Free plan blocks the 6th active service server-side
- [ ] Offers output matches the selected pricing model

**Website structure**

- [ ] WebSite / WebPage IDs use canonical URLs
- [ ] AboutPage / ContactPage only on confirmed, published pages
- [ ] Breadcrumb positions follow the real hierarchy

**Output and compatibility**

- [ ] Exactly one FoundHint JSON-LD script per page; parses as valid JSON
- [ ] Passes Google Rich Results Test and the Schema.org validator on a test site
- [ ] Yoast, Rank Math, AIOSEO, SEOPress each tested on/off; duplicates detected, owner choice respected
- [ ] Turning output off removes only FoundHint's script

**Security and performance**

- [ ] All routes check capability and nonce
- [ ] A description containing `</script><script>alert(1)</script>` renders harmlessly
- [ ] No private or draft data in output
- [ ] Zero extra queries on a warm cache; works behind full-page caching

### 14.3 Test matrix

| Scenario | Plugins | Expected |
| --- | --- | --- |
| Single storefront, no SEO plugin | — | Business + WebSite + WebPage + Breadcrumb, one script |
| Two branches + 5 services (sample data) | — | Page map matches 9.2; Root canal page warns `page_shared` |
| Service-area business, no address | — | No street address, `areaServed` present, eligibility banner amber or green per Google rules |
| Same site with Yoast local details on | Yoast | `duplicate_type` on business; fix panel; recheck clears after switch-off |
| Owner = Rank Math for WebSite | Rank Math | FoundHint skips WebSite, publisher reference still valid |
| Google connection drops after setup | — | Last saved schema keeps printing; red disconnected banner; sync paused |
| Page unpublished after assignment | — | Output stops on that page, `page_unpublished` raised |
