# Setup widget — front-end guide

The setup widget is the first-run flow: **Continue with Google**, choose a
listing, **import it in six steps**, then open the Business Profile.

**Google is required.** Until a Google account is linked the dashboard is
the Get Started introduction, with no "Skip to dashboard": the business
details come from Google, every Business field stays empty and locked, and
every write answers `409 fhint_google_required`.

- Screen route: `#/setup/google`
- Reference code: `src/admin/pages/setup/google.jsx`,
  `src/admin/store/api/googleApi.js`, `src/admin/store/api/onboardingApi.js`
- The Business Profile screen that follows is in
  [business-profile.md](business-profile.md).

All sample values below are real, captured from the running plugin.

---

## 1. Endpoints at a glance

Base: `window.FHINT.rest_url` (namespace `fhint/v1`).

| # | Method | Endpoint | Body | What it does |
|---|---|---|---|---|
| 1 | `GET` | `/google` | — | Is Google connected? |
| 2 | `POST` | `/google/connect` | none | Get the Google sign-in address |
| 3 | `POST` | `/google/profiles` | none | Read the account's listings from Google |
| 4 | `GET` | `/google/profiles` | — | The listings last read (no call to Google) |
| 5 | `GET` | `/google/import/steps` | — | The six import steps, in order |
| 6 | `POST` | `/google/import/step` | JSON | Run one import step |
| 7 | `GET` | `/onboarding` | — | Where the setup is |
| 8 | `PUT` | `/onboarding` | JSON | Finish or dismiss the setup |

---

## 2. Basics for every request

**Headers**

| Header | Value |
|---|---|
| `X-WP-Nonce` | `window.FHINT.rest_nonce` — required on every request |
| `Content-Type` | `application/json` when there is a JSON body |

Send cookies (`credentials: "same-origin"`). The user needs the
`manage_options` capability: logged out → `401`, no permission → `403`.

**Never build a query string with `?` by hand.** On a plain-permalink site
the REST root already contains `?rest_route=`. Use `withQuery()` from
`src/admin/store/api/baseApi.js`.

**Every success** has this envelope:

```json
{ "data": {}, "meta": {} }
```

**Every failure** has this shape:

```json
{
  "code": "fhint_import_no_profiles",
  "message": "Read your Google profiles first, under Business profiles.",
  "data": { "status": 409 }
}
```

Show `message` to the user; branch on `code`.

---

## 3. The flow

```
"Continue with Google" button
   │  POST /google/connect  →  authorize_url
   ▼
Google's own sign-in page
   │  (the SERVER redirects the browser back)
   ▼
#/setup/google                       ← first connection lands here
   │  GET  /google                   check status is "connected"
   │  POST /google/profiles          read the listings          (automatic, once)
   │  GET  /google/import/steps      the six steps
   │
   │  user picks a listing, presses "Import from Google"
   │
   │  POST /google/import/step  { step: "identity" }   ┐
   │  POST /google/import/step  { step: "category" }   │  one at a time,
   │  POST /google/import/step  { step: "address"  }   │  in this order,
   │  POST /google/import/step  { step: "contact"  }   │  await each
   │  POST /google/import/step  { step: "hours"    }   │
   │  POST /google/import/step  { step: "services" }   ┘
   ▼
"Review imported details"  →  PUT /onboarding {finish}   →  #/business?location=1
"I'll do this later"       →  PUT /onboarding {dismiss}  →  #/business   (nothing imported)
```

---

## 4. Endpoints

### 4.1 `GET /google` — is Google connected?

**Request:** no parameters.

**Response `200`**

```json
{
  "data": {
    "status": "connected",
    "configured": true,
    "connect_service": true,
    "client_id_hint": "",
    "redirect_uri": "http://localhost:8100/wp-admin/admin-post.php?action=fhint_google_callback",
    "account_email": "foundhint.plugin@gmail.com",
    "connected_at": 1791742871,
    "expires_at": 1791746470,
    "scopes": ["https://www.googleapis.com/auth/userinfo.email", "openid"],
    "can_manage_profile": true,
    "notice": null
  }
}
```

| Field | Type | Meaning |
|---|---|---|
| `status` | string | `connected` · `needs_reconnect` · `disconnected` · `not_configured` |
| `configured` | bool | `false` = no Google client set up; send the user to `#/google` |
| `account_email` | string | The Google account signed in |
| `connected_at`, `expires_at` | int | Unix timestamps |
| `notice` | object \| null | `{ "code": "...", "message": "..." }` after a failed sign-in. Shown once, then cleared by the server. |

**What to do:** only `status: "connected"` may import. Anything else → show
the **Continue with Google** button.

---

### 4.2 `POST /google/connect` — start the sign-in

**Request:** no body.

**Response `200`**

```json
{
  "data": {
    "authorize_url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=…&state=…"
  }
}
```

**What to do:** `window.location.assign(data.authorize_url)` — a full page
navigation, not a popup.

When Google is finished, **the server** redirects the browser. You do not
choose where:

| Result | Browser lands on |
|---|---|
| Signed in, no listing linked to a location yet (first time) | `#/setup/google` |
| Signed in, a listing is already in use | `#/google` |
| Sign-in failed or was declined | `#/google` (and `notice` is set on `GET /google`) |

**Errors**

| Status | Code | When |
|---|---|---|
| `409` | `fhint_google_not_configured` | No Google client to sign in with |

Use the existing `GoogleSignInButton` component and `useGoogleConnect()` hook.
Do not restyle the button — Google's branding rules apply to it.

---

### 4.3 `POST /google/profiles` — read the listings from Google

Call it **once** when the screen opens with Google connected. It is the only
request this screen makes without the user pressing something.

**Request:** no body.

**Response `200`**

```json
{
  "data": {
    "locations": [
      {
        "id": 1,
        "name": "Shokher Tola 80Tk – Pet Shop Mirpur-12",
        "address": "305 (3rd Floor,Lift 2), House No 05, Noor Islam Molla Avenue, Mirpur 12, Dhaka, 1216, BD",
        "mapped_to": "locations/14430845320964201281",
        "mapped_title": "Shokher Tola 80Tk – Pet Shop Mirpur-12",
        "mapped_address": "305 (3rd Floor,Lift 2), House No 05, Noor Islam Molla Avenue, Mirpur 12, Dhaka, 1216, BD",
        "suggestions": []
      }
    ],
    "google_locations": [
      {
        "id": 2,
        "account_name": "accounts/105451349307150237346",
        "location_name": "locations/495652196029249217",
        "fhint_location_id": 0,
        "title": "FoundHint",
        "store_code": "02005098335465430337",
        "address": "House 23, Shekhertek 3, Mohammadpur, Dhaka, 1207, BD",
        "phone": "01518-984873",
        "website": "https://foundhint.com/",
        "verification_state": "OK",
        "cid": "14962792539401879414",
        "pushed_at": "",
        "synced_at": "2026-10-11 18:31:14"
      },
      {
        "id": 1,
        "account_name": "accounts/105451349307150237346",
        "location_name": "locations/14430845320964201281",
        "fhint_location_id": 1,
        "title": "Shokher Tola 80Tk – Pet Shop Mirpur-12",
        "store_code": "07291428551322498279",
        "address": "305 (3rd Floor,Lift 2), House No 05, Noor Islam Molla Avenue, Mirpur 12, Dhaka, 1216, BD",
        "phone": "01335-521022",
        "website": "https://shokhertola80taka.com/",
        "verification_state": "OK",
        "cid": "9451307654072888532",
        "pushed_at": "",
        "synced_at": "2026-10-11 18:31:14"
      }
    ],
    "synced_at": "2026-10-11 18:31:14"
  },
  "meta": { "accounts": 1, "locations": 2, "failed": 0 }
}
```

The widget uses **`data.google_locations`**:

| Field | Type | Use |
|---|---|---|
| `location_name` | string | **The id to send back** as `location_name`. Treat as opaque. |
| `title` | string | Show in the chooser |
| `address` | string | Show under the title |
| `fhint_location_id` | int | `0` = not linked to a location here yet |

**What to do**

| Listings returned | Show |
|---|---|
| 1 | That listing, preselected. No question. |
| 2 or more | A radio group: "Which Business Profile is this website for?" Import stays disabled until one is chosen. |
| 0, or an error | The message, a **Try again** button, and a link out to `#/business` |

**Errors**

| Status | Code | When |
|---|---|---|
| `409` | `fhint_google_not_connected` | Not signed in |
| `502` | `fhint_google_request_failed` | Google refused or is over quota. `message` explains. |
| `502` | `fhint_google_unreachable` | Google could not be reached |

---

### 4.4 `GET /google/profiles` — the listings last read

Same response as 4.3, read from storage. **Does not call Google.** Use it
anywhere you only need what was last read.

---

### 4.5 `GET /google/import/steps` — the six steps

**Request:** no parameters. Calls nothing, costs nothing.

**Response `200`**

```json
{
  "data": [
    { "id": "identity", "fields": ["name", "description", "opening_date"] },
    { "id": "category", "fields": ["categories", "business_type"] },
    { "id": "address",  "fields": ["address", "coordinates", "service_area"] },
    { "id": "contact",  "fields": ["phone", "additional_phones", "website", "social", "booking"] },
    { "id": "hours",    "fields": ["hours"] },
    { "id": "services", "fields": ["services"] }
  ]
}
```

The front end supplies the label for each `id`:

| `id` | Label to show |
|---|---|
| `identity` | Business name, description and opening date |
| `category` | Category |
| `address` | Address and map pin |
| `contact` | Phone numbers and website |
| `hours` | Opening hours |
| `services` | Services |

---

### 4.6 `POST /google/import/step` — run one step

**Request body**

| Field | Type | Required | Value |
|---|---|---|---|
| `step` | string | yes | `identity` · `category` · `address` · `contact` · `hours` · `services` |
| `location_name` | string | no* | The chosen listing's `location_name` |

\* Required when the account has more than one listing.

```json
{
  "step": "address",
  "location_name": "locations/14430845320964201281"
}
```

**Response `200`**

```json
{
  "data": {
    "step": "address",
    "status": "imported",
    "applied": ["address", "coordinates", "service_area"],
    "skipped": [],
    "location_id": 1,
    "next": "contact"
  }
}
```

| Field | Type | Meaning |
|---|---|---|
| `step` | string | The step that ran |
| `status` | string | `imported` · `unchanged` · `empty` (see below) |
| `applied` | string[] | Field keys that were written |
| `skipped` | string[] | Field keys Google holds nothing for |
| `location_id` | int | The FoundHint location imported into. **Keep it** for the Review button. |
| `next` | string | The following step id; `""` after the last |

**`status` values**

| `status` | Show | Row icon | Meaning |
|---|---|---|---|
| `imported` | Imported | ✓ green | Something was written |
| `unchanged` | Already up to date | ✓ green | Google has it; nothing new to write |
| `empty` | Nothing on Google | – grey | Google holds nothing for this step. **Not an error.** |

Real example — a listing with no services on Google:

```json
{
  "data": {
    "step": "services",
    "status": "empty",
    "applied": [],
    "skipped": ["services"],
    "location_id": 1,
    "next": ""
  }
}
```

**Errors**

| Status | Code | When |
|---|---|---|
| `400` | `rest_invalid_param` | `step` is not one of the six |
| `404` | `fhint_import_unknown_profile` | `location_name` is not a listing this site has read |
| `409` | `fhint_import_no_profiles` | No listings stored — call `POST /google/profiles` first |
| `409` | `fhint_import_choose_profile` | Several listings and no `location_name` sent |
| `409` | `fhint_import_no_name` | Google has no business name to create a business from |
| `409` | `fhint_import_no_address` | Google has no address to create a location from |
| `409` | `fhint_google_not_connected` | Not signed in |
| `502` | `fhint_google_request_failed` / `fhint_google_unreachable` | Google refused or could not be reached |

Error sample:

```json
{
  "code": "fhint_import_choose_profile",
  "message": "Choose which Google profile to import from.",
  "data": { "status": 409 }
}
```

---

### 4.7 `GET /onboarding` — where the setup is

**Request:** no parameters.

**Response `200`** (the `steps` list is shortened)

```json
{
  "data": {
    "status": "in_progress",
    "current": "welcome",
    "completed": [],
    "skipped": [],
    "started_at": 1791742889,
    "ended_at": 0,
    "steps": [
      { "id": "welcome",  "position": 1, "is_data_step": false, "has_data": false, "completed": false, "skipped": false, "done": false },
      { "id": "business", "position": 2, "is_data_step": true,  "has_data": true,  "completed": false, "skipped": false, "done": true }
    ],
    "total_steps": 4,
    "done_steps": 3,
    "is_open": true,
    "next_step": "business",
    "previous_step": ""
  }
}
```

| Field | Meaning |
|---|---|
| `status` | `not_started` · `in_progress` · `done` · `dismissed` |
| `is_open` | `true` while the setup has not been finished or dismissed. The dashboard shows its "Get started" screen only while this is `true`. |

---

### 4.8 `PUT /onboarding` — finish or dismiss

`POST` and `PATCH` are accepted too.

**Request body**

| Field | Type | Required | Value for this widget |
|---|---|---|---|
| `action` | string | yes | `finish` or `dismiss` |

```json
{ "action": "finish" }
```

**Response `200`** — the same object as `GET /onboarding`:

```json
{
  "data": {
    "status": "done",
    "current": "done",
    "completed": [],
    "skipped": [],
    "started_at": 1791742889,
    "ended_at": 1791743513,
    "steps": [],
    "total_steps": 4,
    "done_steps": 3,
    "is_open": false,
    "next_step": "",
    "previous_step": "services"
  }
}
```

| Button | Send | Then go to |
|---|---|---|
| **Review imported details** | `{ "action": "finish" }` | `#/business?location={location_id}` |
| **I'll do this later** | `{ "action": "dismiss" }` | `#/business` — nothing is imported |

If this request fails, navigate anyway. Leaving matters more than recording it.

---

## 5. Running the import

Run the steps **in order, one at a time, awaiting each one**:

```js
const run = async () => {
  setPhase("running");

  for (const step of steps) {
    setProgress(step.id, "running");

    try {
      const result = await runStep({
        step: step.id,
        locationName: chosenListing,
      }).unwrap();

      setProgress(step.id, result.status); // imported | unchanged | empty

      if (result.location_id) {
        setLocationId(result.location_id);
      }
    } catch (error) {
      setProgress(step.id, "failed");
      setFailure(errorMessage(error));
      setPhase("stopped"); // show "Try again"
      return;
    }
  }

  setPhase("finished");
};
```

**Why in order and not all at once**

- `identity` must run first. It is the step that reads Google, and it creates
  the business and the location when the site has none.
- The other five reuse that one read (kept on the server for two minutes), so
  the whole import costs **one read of Google, not six**.
- Six parallel requests would each call Google.

**Try again** after a failure runs from the failed step; steps already
finished are skipped.

---

## 6. Screen states

| State | Heading | Main button |
|---|---|---|
| Google not connected | Connect Google first | Continue with Google |
| Reading listings | Bring your details in from Google | (spinner) |
| Ready | Bring your details in from Google | **Import from Google** — disabled until a listing is chosen |
| Importing | Importing your details | Importing… (disabled) |
| Stopped on an error | Importing your details | **Try again** |
| Finished | Import finished | **Review imported details** |

Sub-heading on every state: *"We are copying your details from Google into
FoundHint. Nothing on Google changes."*

**Each row** shows: a box, the step label, and the status word at the right.

| Row state | Box | Word |
|---|---|---|
| waiting | empty | Waiting |
| running | spinner | Importing… |
| `imported` | ✓ green | Imported |
| `unchanged` | ✓ green | Already up to date |
| `empty` | – grey | Nothing on Google |
| failed | × red | Not imported |

**Progress bar:** `settled steps / total steps`, where settled =
`imported`, `unchanged` or `empty`.

**Header bar:** logo, "FOUNDHINT SETUP", "Connecting Google" on the right,
and the **I'll do this later** link (disabled while a step is running).

---

## 7. Rules

1. **Import steps run one at a time, in order.** Never in parallel.
2. **Nothing is imported until "Import from Google" is pressed.** Reading the
   listings is the only automatic request.
3. **`empty` is not a failure.** Show "Nothing on Google" and carry on.
4. **Send `location_name` exactly as received.** Do not build or edit it.
5. **Keep `location_id`** from the step responses; it is where Review goes.
6. **Status in words, not only colour.** The word at the end of the row is
   what says it; the box is decoration.
7. **Move focus to the heading** when the state changes (Importing → Import
   finished), so a screen reader announces it.
8. **Every string through `__()`** with the `foundhint-local-seo` text domain.
