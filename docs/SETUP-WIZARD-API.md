# Guided setup — a front-end developer's guide

Everything needed to build the setup wizard against FoundHint's API.

Verified against the running plugin on 7 October 2026. Source of truth:
`includes/App/Onboarding/Onboarding.php`, `includes/API/Onboarding.php`.

---

## The one rule that explains the whole design

**The wizard stores a position. It never stores content.**

`GET`/`PUT /onboarding` moves a pointer — which step you are on, which you
have finished or skipped. The values the user types are saved through the
**ordinary resource endpoints**: `PUT /business`, `POST /locations`,
`POST /services`, and the hours routes. The same ones the normal screens use.

Two consequences you need to design around:

1. **There is no endpoint that saves wizard data.** If you are looking for
   `POST /onboarding/business`, it does not exist and will not be added. A
   second write path would mean a second set of validation rules.
2. **"Start over" is safe.** `restart` rewinds the pointer only. Nothing the
   user entered is deleted, so you can offer it without a scary confirmation.

---

## Connecting

Everything is under the REST namespace `fhint/v1`. The admin bundle is handed
what it needs on `window.FHINT`:

```js
window.FHINT.rest_url    // e.g. "https://example.com/wp-json/fhint/v1"
window.FHINT.rest_nonce  // send as the X-WP-Nonce header
window.FHINT.reference   // business_types, location_statuses, timezones, …
```

Every request needs `X-WP-Nonce` and same-origin credentials. Every route
requires `manage_options`; a logged-out request gets `401`, a logged-in user
without the capability gets `403`.

**Do not build the query string by hand with `?`.** A site on plain
permalinks already has one in its REST root, and a second turns the request
into a 404. Use the `withQuery()` helper in `src/admin/store/api/baseApi.js`.

---

## `GET /onboarding`

Returns the position *and* a live per-step status. Responses use the standard
envelope — the payload is under `data`.

```json
{
  "data": {
    "status": "not_started",
    "current": "welcome",
    "completed": [],
    "skipped": [],
    "started_at": 0,
    "ended_at": 0,
    "steps": [
      { "id": "welcome",  "position": 1, "is_data_step": false, "has_data": false, "completed": false, "skipped": false, "done": false },
      { "id": "business", "position": 2, "is_data_step": true,  "has_data": true,  "completed": false, "skipped": false, "done": true  },
      { "id": "location", "position": 3, "is_data_step": true,  "has_data": true,  "completed": false, "skipped": false, "done": true  },
      { "id": "hours",    "position": 4, "is_data_step": true,  "has_data": true,  "completed": false, "skipped": false, "done": true  },
      { "id": "services", "position": 5, "is_data_step": true,  "has_data": true,  "completed": false, "skipped": false, "done": true  },
      { "id": "done",     "position": 6, "is_data_step": false, "has_data": false, "completed": false, "skipped": false, "done": false }
    ],
    "total_steps": 4,
    "done_steps": 4,
    "is_open": true,
    "next_step": "business",
    "previous_step": ""
  }
}
```

### Field by field

| Field | Meaning |
|---|---|
| `status` | `not_started` · `in_progress` · `done` · `dismissed` |
| `current` | The step to render now |
| `completed` / `skipped` | Steps the user walked through or passed over |
| `started_at` / `ended_at` | Unix timestamps; `0` when it has not happened |
| `steps[]` | Every step, in order, with its live status |
| `total_steps` | **Data steps only** (4) — use this as the progress denominator |
| `done_steps` | How many data steps are satisfied |
| `is_open` | False once `done` or `dismissed` — gate any "resume setup" prompt on this |
| `next_step` / `previous_step` | `''` at the ends; use these rather than computing neighbours |

### `done` is computed, not remembered

```
done = has_data || completed
```

`has_data` is read from the database on **every request**, never from a flag:

| Step | `has_data` is true when |
|---|---|
| `business` | the business record has a non-empty name |
| `location` | the primary location has both an address line 1 and a city |
| `hours` | that location has any opening-hours rows |
| `services` | at least one service exists |

This is why the sample above shows `status: "not_started"` while every data
step is already `done` — that site was set up through the normal screens and has
never opened the wizard. **Do not ask the user for something they already
have.** Render a satisfied step as already answered, prefilled, with the
option to change it.

`welcome` and `done` are not data steps; they can only become `done` by being
walked.

---

## `POST | PUT | PATCH /onboarding`

Moves the pointer. Returns the same state object as the `GET`, so you can use
the response directly instead of refetching.

```json
{ "action": "complete", "step": "business" }
```

| Param | Required | Values |
|---|---|---|
| `action` | **yes** | `go` · `complete` · `skip` · `finish` · `dismiss` · `restart` |
| `step` | no | `welcome` · `business` · `location` · `hours` · `services` · `done`. Defaults to the current step. |

Anything outside those enums is rejected with a `400` before your callback
runs.

### What each action does

| Action | Effect |
|---|---|
| `go` | Sets `current` to `step`. Use for Back, and for jumping from a step list. |
| `complete` | Adds `step` to `completed` **and advances `current` to the next step.** |
| `skip` | Same, but records it under `skipped`. |
| `finish` | `status: done`, `current: done`, stamps `ended_at`. |
| `dismiss` | `status: dismissed`, stamps `ended_at`. For "I'll do this later". |
| `restart` | Resets the pointer to `welcome`, clears `completed`/`skipped`, restarts the clock. **Content is untouched.** |

Note that `complete` and `skip` **already advance the step**. Do not follow
them with a `go`, or you will skip a step.

The first write also flips `status` from `not_started` to `in_progress` and
stamps `started_at`, so you never need to send a "start" action.

---

## The order of operations for a step

This is the part worth getting right:

1. User fills the step's fields.
2. **Save the content** through that entity's own endpoint (`PUT /business`,
   `POST /locations`, …). See `includes/API/README.md` for payloads, partial
   update rules and the opening-hours format.
3. **Only if that succeeds**, `PUT /onboarding` with
   `{ action: "complete", step: "<id>" }`.
4. Render the step named by `current` in the response.

Advancing before the save confirms would mark a step done that holds nothing.

### Errors belong to the content call, not to the wizard

Validation failures come back from step 2 as `400` with **per-field machine
codes** — `business.name.required`, not an English sentence. Map them through
`src/admin/lib/errors.js` and attach each message to its own input. The
`/onboarding` call has nothing to say about validity.

Never let client-side checks stand in for the server's answer; the server
validates every write regardless of what the form already checked.

---

## Using it in this codebase

```js
import {
  useGetOnboardingQuery,
  useMoveOnboardingMutation,
} from "@/store/api/onboardingApi";

const { data: state, isLoading } = useGetOnboardingQuery();
const [move] = useMoveOnboardingMutation();

// after the content save resolves:
await move({ action: "complete", step: "business" }).unwrap();
```

The mutation invalidates the `Onboarding` tag, so the query refreshes itself.

Existing implementation to read or replace: `src/admin/pages/setup/` —
`WizardShell.jsx`, `StepActions.jsx`, and one component per step.

---

## Accessibility, which is a requirement here

- **Move focus to the step heading on every step change** — not the page
  title. The page has not changed; the step has.
- Advancing is client-side navigation. **Never reload the page.**
- Label every control. A placeholder is not a label.
- Announce saves and errors through `role="status"` and `role="alert"`.
- Never signal state with colour alone — pair it with text or an icon.
- No positive `tabindex`.

There is no automated a11y harness in this plugin yet, so these are checked
by hand — which means they are easy to let slip. Check them per step, not at
the end.

---

## Things that will bite you

- **The wizard is currently unreachable from the UI.** The sidebar entry is
  commented out (`src/admin/layouts/root/components/Sidebar.jsx`) and the
  dashboard's Get started card does not link to it. The route works if you
  visit `#/setup` directly. Wire up an entry point as part of any work here.
- **`total_steps` is 4, not 6.** Counting the greeting in a progress bar
  makes setup look longer than it is.
- **Every string goes through `__()`** with the `foundhint-local-seo` text domain.
- **Routing is hash-based** under a single WordPress admin page
  (`admin.php?page=fhint`). There is no server-side route for `/setup`.
