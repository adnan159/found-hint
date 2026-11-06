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
  it does ("Choose a template for each star rating, then switch it on.").
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
| **How to reply** | A grid: ratings 5 → 1 × *With a comment* / *Stars only*. Each cell: **My templates**, **AI reply** (disabled, *Coming soon* badge) or **Don't reply**. |
| Template picker | With *My templates*, a second list under the cell offers that rating and kind's templates; the owner chooses the one to send. With exactly one template it is chosen at once. |
| Cell notes | "No templates yet. **Add one**" opens the template editor for that rating and kind, comes back with the draft kept, and the new template chosen. |
| Advice | "We suggest replying to 1 and 2 star reviews yourself…" |
| Footer | "N of 10 review kinds get a reply · checked every 10 minutes", or "Auto-reply is off". **Save** is refused while a *My templates* cell has no template chosen. |

**On a review**: a reply auto-reply wrote carries **"Sent by auto-reply"**
(`AutoLabel.jsx`).

**Defaults**: off; new reviews only; every cell **Don't reply** — nothing
goes out until the owner chooses a template for a rating.

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
  4. for each: choose() → AutoReplyLog::claim() → ReplyText::fill()
                → ReviewReply::save() (free)
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
   than `MAX_ATTEMPTS` (3) times — and no other run is **sending it right
   now** (a `sending` row younger than 15 minutes).

Oldest first, at most `PER_RUN` (20) a run, so a large backlog goes out a
little at a time rather than in one burst.

### What is sent — `AutoReplier::choose()` and `ReplyText`

- **My templates**: the template chosen for that rating and kind
  (`picks`; templates are shared by all locations) — the same one every
  time. If it is gone or no longer of that rating and kind, the review is
  skipped (not counted as a failure).
- There is no built-in reply any more; a rule saved as `builtin` by an
  older version reads as **Don't reply**.

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

**Never twice, even when runs overlap.** A run can outlast WP-Cron's
60-second lock (it reads every location from Google, then sends up to 20
replies), so two runs can both find the same review due. Before anything
goes to Google the review is **claimed** (`AutoReplyLog::claim()`): the
first insert of its unique `review_id` as `sending`, or one conditional
update of a `failed` row. Only one claim changes the database, so only one
run sends; the other skips it. A `sending` row older than
`AutoReplyLog::STUCK_AFTER` (15 minutes) is a run that died, and can be
claimed again — if that send had reached Google, the review now has a
reply and is never due again.

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
		5 => array( 'comment' => 'template', 'stars' => 'off' ),
		// …every cell 'off' by default
	),
	'picks' => array(
		5 => array( 'comment' => 12, 'stars' => 0 ), // template ids, 0 = none
		// …
	),
)
```

Each rule is `template` | `off`. Saving is checked server-side: an unknown
scope (`auto_reply.scope.invalid`), an unknown rule
(`auto_reply.rule.invalid` — `ai` and the old `builtin` are refused), and
`template` without a usable template, on the field `rules.{rating}.{kind}`
(shown under that cell): `auto_reply.rule.no_templates` when that rating
and kind has none, `auto_reply.rule.pick_template` when none is chosen or
the chosen one belongs elsewhere. Checked for the cells a save sets (in
`rules` or `picks`), so the band's on/off switch (which sends only `on`)
is never blocked by a cell it does not touch; the sender skips such a cell.

**Templates a rule depends on**: a template a *My templates* cell sends
cannot be deleted, or moved to another rating or kind (`409
fhintpremium_template_in_use`, shown in the template dialog) — choose
another template for that cell first. Its name and words can change.

**Table `{prefix}fhintpremium_auto_replies`** (`CreateAutoRepliesTable`,
Premium DB 1.2.0): `review_id` (unique), `location_name`, `rating`, `kind`,
`source` (template; `builtin` on older rows), `template_id`, `status` (sending | sent | failed),
`attempts`, `error`, `created_at`, `updated_at`. The class docblock is the
authoritative column reference.

**Uninstall**: deleting Premium removes the option; with the free plugin's
"Delete data on uninstall" on, the table goes too.

---

## 4. REST

Premium, `fhint-premium/v1`, licence and `manage_fhint` required:

| Route | Does |
|---|---|
| `GET reviews/auto-reply` | `{ on, scope, rules, picks, sent, unanswered, replied_ids[] }` |
| `PUT reviews/auto-reply` | Any of `{ on, scope, rules, picks }`; returns the same shape; schedules or clears the event. `400 fhint_validation_failed` with per-field codes. |

The templates the rules use are `GET/POST reviews/templates`,
`PUT/DELETE reviews/templates/{id}` (see the Premium `CLAUDE.md`).

---

## 5. Where the code lives

**Premium** (`found-hint-premium/includes/`):

| File | Role |
|---|---|
| `App/Review/AutoReplier.php` | The cron job: `run()`, `due()`, `choose()`, `context()`, sending |
| `App/Review/AutoReplySettings.php` | The option, defaults, validation |
| `App/Review/ReplyText.php` | Placeholders, first names |
| `App/Review/AutoReplyLog.php` | The log table: claim, record, sent count, answered ids |
| `Database/CreateAutoRepliesTable.php` | The table |
| `API/AutoReply.php` | The route |

**Free** (`src/admin/`):

| File | Role |
|---|---|
| `store/api/autoReplyApi.js` | RTK Query: get and save |
| `pages/reviews/hooks/useAutoReply.js` | State, the switch, save, answered ids |
| `pages/reviews/components/autoreply/AutoReplySection.jsx` | Band + which dialog is open; the draft |
| `…/AutoReplyBand.jsx`, `AutoReplyDialog.jsx`, `ScopePicker.jsx`, `RulesGrid.jsx`, `RuleCell.jsx`, `AutoLabel.jsx` | The pieces above; `RuleCell` is one cell — reply type and template picker |
| `pages/reviews/lib/autoReply.js` | The cell options, changing a cell (auto-choosing a lone template), whether a cell still needs a template |
| `pages/reviews/lib/replies.js` | The reply dialog's suggested replies, and placeholders (mirrored in `ReplyText`) |

---

## 6. Testing

```bash
docker exec foundhunt_app php /var/www/html/wp-content/plugins/found-hint-premium/tests/Integration/autoreply.php
```

75 checks on their own tables, with Google answered in-process (nothing is
posted): settings and validation (defaults all off, an old `builtin` read
as off, a template required and of the right rating and kind), the reply
text, which reviews are due, the chosen template sent every time, a run
sending the right text to the right address, never
twice — including two overlapping runs that both found a review due, and a
dead run's claim taken over — failures retried to the limit, nothing when
off or unlicensed, a chosen template kept (not deleted, not moved), nothing
sent when it is gone, the switch never blocked by an
untouched cell, the schedule, the route and uninstall.

**Live check** (posts a real public reply): switch auto-reply on with *New
reviews only* and a rule for the test rating, leave a review on the Google
profile, then load any page of the site after 10 minutes. The reply should
appear on Google and on Reviews with "Sent by auto-reply".

---

## 7. Not built yet

- **AI replies**: the *AI reply* option (listed, disabled, *Coming soon*), the AI writing style (FoundHint
  style / my own instructions), AI credits and "Free AI replies left", and
  "If credits run out, use a template instead of pausing".
- A delay of 1–10 minutes per review (replies go out on the first run after
  the review is read).
- `{{business_keyword}}` has no value yet.
