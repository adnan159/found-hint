# Review auto-reply

How FoundHint answers Google reviews automatically: what the owner sees,
how a reply is chosen and sent, and where each part lives. Built from the
FHReviews design (`Product roadmap priorities – FHReviews.html`), without
its AI parts, which come later.

Auto-reply is a **Premium** feature (`reviews.auto_reply`). As with every
Premium feature, the screens are in this (free) plugin and the logic, data
and routes are in `../found-hint-premium`.

---

## 1. What the owner sees

**The band** at the top of Reviews (`components/autoreply/AutoReplyBand.jsx`):

- *Auto-reply* with **Active** (green) or **Paused**, and a line saying what
  it does.
- **Auto-replies sent**: the count of replies it has posted.
- **Set up**: opens the setup dialog.
- **ON/OFF switch**: saves at once and confirms with a toast ("Auto-reply is
  on. New reviews are checked every 10 minutes." / "Auto-reply is paused…").
- Without Premium: a *Premium* pill and **Unlock with Premium**
  (foundhint.com/pricing/), or **Activate licence** when Premium is
  installed but its licence is not active. No switch, no count.

**"Set up auto-reply"** (`AutoReplyDialog.jsx`, nothing changes until Save):

| Part | What it does |
|---|---|
| Switch | On / off, with "On. FoundHint replies…" or "Off. Nothing is sent automatically. Your choices are kept." |
| **Which reviews** | *New reviews only* — reviews written after auto-reply was switched on. *New and N unanswered* — every review with no reply too, oldest first. |
| **How to reply** | A grid: ratings 5 → 1 × *With a comment* / *Stars only*. Each cell: **My templates**, **Built-in reply** or **Don't reply**. |
| Cell notes | "N templates take turns." — or "No templates yet. **Add one**", which opens the template editor for that rating and kind and comes back with the draft kept. |
| Advice | "We suggest replying to 1 and 2 star reviews yourself…" |
| Footer | "N of 10 review kinds get a reply · checked every 10 minutes", or "Auto-reply is off". **Save** is refused while a cell uses My templates with none. |

**On a review**: a reply auto-reply wrote carries **"Sent by auto-reply"**
(`AutoLabel.jsx`).

**Defaults**: off; new reviews only; built-in replies for 3, 4 and 5 stars;
1 and 2 stars left to the owner.

---

## 2. How a reply goes out

```
WP-Cron, every 10 minutes, only while auto-reply is on
        │
        ▼
AutoReplier::run()
  1. stop unless: switched on · licence active · Google connected
  2. ReviewSync::run('')        read the latest reviews from Google (free)
  3. AutoReplier::due()         which reviews to answer now
  4. for each: choose() → ReplyText::fill() → ReviewReply::save() (free)
  5. AutoReplyLog::record()     sent, or failed with the reason
```

### Which reviews are due — `AutoReplier::due()`

A review is answered when **all** of these hold:

1. it has **no reply** and is **not removed** from Google;
2. it has a **star rating** (1–5);
3. its rule — rating × kind — is **not "Don't reply"**
   (*kind* = `comment` when the review has words, `stars` when it is a
   rating alone);
4. it is **in scope**: for *New reviews only*, written at or after the
   moment auto-reply was last switched on (`since`); for *New and
   unanswered*, any date;
5. auto-reply has **not answered it before** — or tried and failed fewer
   than `MAX_ATTEMPTS` (3) times.

Oldest first, at most `PER_RUN` (20) a run, so a large backlog goes out a
little at a time rather than in one burst.

### What is sent — `AutoReplier::choose()` and `ReplyText`

- **Built-in reply**: the reply for that rating and kind from
  `ReplyText::builtin()` — the same wording as the reply dialog's built-in
  reply (`src/admin/pages/reviews/lib/replies.js`).
- **My templates**: the owner's templates for that rating and kind
  (shared by all locations). They **take turns**: the next one is
  `replies already sent from templates for this rating and kind ÷ number
  of templates`, remainder — so with templates A and B it goes A, B, A, B.
  If every template there has been deleted, the review is skipped (not
  counted as a failure).

Then `ReplyText::fill()` swaps the placeholders:

| Placeholder | Becomes |
|---|---|
| `{{reviewer_name}}` | The reviewer's first name ("IMAM HOSSAIN" → "Imam"); nothing for an anonymous reviewer |
| `{{location_name}}` | The Google listing's title |
| `{{location_city}}` | The linked FoundHint location's city |
| `{{business_keyword}}` | Empty for now |
| `{{rating}}` | The stars, e.g. `5` |
| `{{review_text}}` | The review's words |

An empty value never leaves stray punctuation: "Thanks for the 4 stars,
{{reviewer_name}}!" becomes "Thanks for the 4 stars!", a reply opening with
the name loses its leading comma, and the first letter is capitalised. The
free app's `fillPlaceholders()` follows the same rules — **change both
together**.

### Sending and the record

The reply goes out through the free plugin's `ReviewReply::save()` — the
same call as pressing Publish in the reply dialog, so Google's limits, the
stored copy of the reply and the log line are identical. Then:

- **sent** → `AutoReplyLog` gets a `sent` row; the review now has its reply,
  so it is never due again; the sent count and the label read this row.
- **failed** (Google refused or could not be reached) → a `failed` row with
  the reason and `attempts` + 1; the next runs try again until 3 attempts,
  then leave it for the owner.

One row per review (unique `review_id`) is what guarantees a review is
never answered twice, even if two runs overlap.

### When it runs

- The event `fhintpremium_auto_reply` runs every 10 minutes
  (`fhintpremium_ten_minutes`). `AutoReplier::ensure_schedule()` (on `init`,
  and after every save) adds it while auto-reply is on and removes it when
  off.
- Deactivating Premium removes the event.
- **WP-Cron runs on page visits.** On a quiet site the check happens on the
  first visit after the 10 minutes are up. A site that wants it on the dot
  should call `wp-cron.php` from a real cron job.

### What stops it

Nothing is sent when auto-reply is off, when Premium's licence is not
active (`License::active()`), or when Google is not connected — the run
simply returns. The Premium routes refuse without a licence, too.

---

## 3. Settings and data

**Option `fhintpremium_auto_reply`** (`AutoReplySettings`, preferences only):

```php
array(
	'on'    => false,
	'scope' => 'new',                    // new | all
	'since' => '2026-11-06 10:00:00',    // UTC, set when switched on
	'rules' => array(
		5 => array( 'comment' => 'builtin', 'stars' => 'builtin' ),
		// …4, 3: builtin; 2, 1: off
	),
)
```

Each rule is `template` | `builtin` | `off`. Saving is checked server-side:
an unknown scope (`auto_reply.scope.invalid`), an unknown rule
(`auto_reply.rule.invalid` — `ai` is refused until AI replies exist), and
`template` where there is no template (`auto_reply.rule.no_templates`, on
the field `rules.{rating}.{kind}`, shown under that cell).

**Table `{prefix}fhintpremium_auto_replies`** (`CreateAutoRepliesTable`,
Premium DB 1.2.0): `review_id` (unique), `location_name`, `rating`, `kind`,
`source` (template | builtin), `template_id`, `status` (sent | failed),
`attempts`, `error`, `created_at`, `updated_at`. The class docblock is the
authoritative column reference.

**Uninstall**: deleting Premium removes the option; with the free plugin's
"Delete data on uninstall" on, the table goes too.

---

## 4. REST

Premium, `fhint-premium/v1`, licence and `manage_fhint` required:

| Route | Does |
|---|---|
| `GET reviews/auto-reply` | `{ on, scope, rules, sent, unanswered, replied_ids[] }` |
| `PUT reviews/auto-reply` | Any of `{ on, scope, rules }`; returns the same shape; schedules or clears the event. `400 fhint_validation_failed` with per-field codes. |

The templates the rules use are `GET/POST reviews/templates`,
`PUT/DELETE reviews/templates/{id}` (see the Premium `CLAUDE.md`).

---

## 5. Where the code lives

**Premium** (`found-hint-premium/includes/`):

| File | Role |
|---|---|
| `App/Review/AutoReplier.php` | The cron job: `run()`, `due()`, `choose()`, `context()`, sending |
| `App/Review/AutoReplySettings.php` | The option, defaults, validation |
| `App/Review/ReplyText.php` | Built-in replies, placeholders, first names |
| `App/Review/AutoReplyLog.php` | The log table: record, sent count, template turns, answered ids |
| `Database/CreateAutoRepliesTable.php` | The table |
| `API/AutoReply.php` | The route |

**Free** (`src/admin/`):

| File | Role |
|---|---|
| `store/api/autoReplyApi.js` | RTK Query: get and save |
| `pages/reviews/hooks/useAutoReply.js` | State, the switch, save, answered ids |
| `pages/reviews/components/autoreply/AutoReplySection.jsx` | Band + which dialog is open; the draft |
| `…/AutoReplyBand.jsx`, `AutoReplyDialog.jsx`, `ScopePicker.jsx`, `RulesGrid.jsx`, `AutoLabel.jsx` | The pieces above |
| `pages/reviews/lib/replies.js` | Built-in replies and placeholders for the reply dialog (mirrored in `ReplyText`) |

---

## 6. Testing

```bash
docker exec foundhunt_app php /var/www/html/wp-content/plugins/found-hint-premium/tests/Integration/autoreply.php
```

48 checks on their own tables, with Google answered in-process (nothing is
posted): settings and validation, the reply text, which reviews are due,
template turns, a run sending the right text to the right address, never
twice, failures retried to the limit, nothing when off or unlicensed, the
schedule, the route and uninstall.

**Live check** (posts a real public reply): switch auto-reply on with *New
reviews only* and a rule for the test rating, leave a review on the Google
profile, then load any page of the site after 10 minutes. The reply should
appear on Google and on Reviews with "Sent by auto-reply".

---

## 7. Not built yet

- **AI replies**: the *AI reply* option, the AI writing style (FoundHint
  style / my own instructions), AI credits and "Free AI replies left", and
  "If credits run out, use a template instead of pausing".
- A delay of 1–10 minutes per review (replies go out on the first run after
  the review is read).
- `{{business_keyword}}` has no value yet.
