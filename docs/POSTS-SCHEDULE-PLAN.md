# Posts scheduling — build plan

Source: the "FoundHint Posts" design (`Product roadmap priorities – FoundHint
Posts.html`, 2026-11-05). Scheduling is FoundHint Premium (feature keys
`posts.schedule`, `posts.csv`, later `posts.auto` — see `docs/EXTENDING.md`).
Open items are unticked; tick them with the date when done and record the
evidence in `docs/PROGRESS.md`.

## 0. What the design asks for

- **Composer — When to publish:** Now · **Schedule** · Draft. Schedule shows a
  `datetime-local` input ("Publish on") and the note "Sent at this time. You
  can change or cancel it until then."
- Primary button **Schedule post** (busy: "Scheduling…"); review summary row
  **When**; toast "Scheduled. It will go out on {date}."
- **List:** blue *Scheduled* tag, "Goes live in N days", edit button
  labelled **Change**. Status filter already has *Scheduled*.
- **Order (changed 2026-11-05, owner's call over the design):** newest first
  puts the last post added on top, scheduled or not — not the design's
  "scheduled after the posted ones, soonest first".
- **CSV:** "Schedule many posts at once" — drop zone, template download, every
  row checked before anything is scheduled.
- **Auto-posting:** switch, posted-this-month and in-queue counts, how often,
  what to post about; each auto post waits 24 h in the queue.

## 1. Decisions

| # | Decision | Default |
|---|---|---|
| D1 | Time zone of the picker | The WordPress site time zone (`wp_timezone()`), named next to the input. Locations have no time-zone column. |
| D2 | What sends a due post | One recurring WP-Cron sweep every 5 minutes (Premium), not one event per post — a lost event would mean a post that never goes out. |
| D3 | Double sending | The sweep claims each due row with one conditional `UPDATE … WHERE status = 'scheduled'` before sending. |
| D4 | Who may set `scheduled` | Premium only. The free plugin never writes it (table docblock), but treats a scheduled post like a draft for editing and deleting. |
| D5 | Premium switched off with posts queued | They stay *Scheduled* in the list with "Needs FoundHint Premium to send", and can be cancelled back to drafts. |
| D6 | Allowed time | At least 5 minutes ahead, at most one year; an event's must be before it ends. Checked with Publish's strict rules. |

## 2. Lifecycle

```
draft ──schedule──▶ scheduled ──sweep──▶ live | failed
  ▲                    │  │
  └──── cancel ────────┘  └── publish now ──▶ live | failed
```

A failed scheduled post keeps Google's reason; the existing Retry sends it.

## 3. Phase 1 — schedule one post (`posts.schedule`)

### Free plugin
- [x] Plan saved (this file).
- [x] Server: a `scheduled` post can be edited, published and deleted like a draft; editing keeps it scheduled and is checked strictly (2026-11-05).
- [x] Server: free `POST /posts/{id}/unschedule` (cancel → draft); `scheduled_local` on every post and `timezone` in state; the design's list order in SQL (2026-11-05). Whether Premium serves scheduling is read client-side (`hasPro`), so the server needs no flag.
- [x] Split `Composer.jsx` (696 lines) into `components/composer/*`, `hooks/useComposer.js`, `lib/composer.js` — every file ≤ 150 (2026-11-05).
- [x] `WhenToPublish` + `ScheduleField` (site time zone shown), behind `hasPro( 'posts.schedule' )`; without it the option stays disabled with the `PRO` tag (2026-11-05).
- [x] Button "Schedule post" / "Scheduling…", toast with the date; title "Change scheduled post" (2026-11-05).
- [x] RTK: `postScheduleApi.schedulePost` (Premium), `postsApi.unschedulePost` (free); `post.scheduled_at.*` messages in `lib/errors.js` (2026-11-05).
- [x] Rows: "Goes live in 3d · date", "Change", **Publish now** and **Cancel schedule**; *Scheduled* in the status filter; newest added on top (2026-11-05).
- [x] Database tests (order, strict save, unschedule), mutation-checked; route smoke test; real bundle in the browser against a mock, Premium on and off (2026-11-05).
- [x] `includes/API/README.md`, `docs/EXTENDING.md`, `docs/PROGRESS.md` (2026-11-05).

### Premium (`../found-hint-premium`, not in this checkout yet)
- [x] (2026-11-05) `POST fhint-premium/v1/posts/{id}/schedule` `{ scheduled_at }` (site wall time → UTC; D1, D6), answering the post as the free routes present it (`Posts::present()`), codes `post.scheduled_at.required|invalid|too_soon|too_far|after_event`, plus the publishing rules (`PostValidator::validate( $post, true )`). Rescheduling is the same call. Cancelling is the free route — no Premium route needed.
- [x] 5-minute sweep (D2) plus one event at each post's own time, with the row claim (D3) to `sending`; sends through `PostPublisher`; failure keeps Google's reason; a post stuck `sending` 15 min is failed, never resent (2026-11-05).
- [x] Adds `posts.schedule` to its feature list (2026-11-05).
- [x] `tests/Smoke/posts.php` (17, time rules) and `tests/Integration/posts.php` (42: schedule, send once, claim, mid-send lock, stuck, refused, route); mutation-checked (2026-11-05).

## 4. Phase 2 — CSV (`posts.csv`) — on hold

The header button was removed on request (2026-11-05); nothing of the CSV
flow is drawn. Restore the button with the feature if it is built.

- [ ] Template download; upload parsed on the server; per-row codes.
- [ ] Preview table; confirm creates `scheduled` rows with source `csv`.

## 5. Phase 3 — Auto-posting (`posts.auto`, new key)
- [ ] Needs the AI writer (`posts.ai`) first.
- [ ] Settings (how often, topic); queue with a 24 h hold; counts card.

## 6. Out of scope here
Step-by-step composer, posting one post to several locations, Facebook as a
channel, "Partly failed" status — in the design, separate from scheduling.

## 7. Caveat
WP-Cron runs on visits. A quiet site sends late. Built (step 96): while a
post is on the schedule and the sweep is more than 20 minutes overdue, the
Posts screen warns and links to a guide to a real cron job (Premium
`CronHealth`, free `components/cron/`).
