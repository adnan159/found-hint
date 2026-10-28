# FoundHint and FoundHint Pro

**All UI is in this plugin. FoundHint Pro (`../found-hint-pro`) is
server-side only** — REST routes, data, background jobs, limits. It has
no admin page, script or style of its own, and it never edits this plugin.

## How a Pro feature is built

1. **Pro (PHP):** the routes under `fhint-pro/v1` (guarded by this
   plugin's `manage_fhint` capability), tables, jobs. When the feature
   works, add its key to `FHINTPRO\App\Core\Features::active()`.
2. **Free (React):** the screen, in this app. Wrap it:

   ```jsx
   <ProFeature feature="reviews.templates" fallback={<TemplatesCard />}>
     <ProTemplatesCard />
   </ProFeature>
   ```

   `fallback` is the upsell everyone sees without Pro; `children` is the
   working screen, shown only when Pro lists that feature. Its endpoints go
   in `src/admin/store/api/proApi.js` (absolute URLs from `proRestUrl()`).

The browser-side check is only about what to draw. The real gate is the
server: without Pro, the `fhint-pro/v1` routes do not exist.

## Hooks this plugin offers Pro

| Hook | Kind | What for |
|---|---|---|
| `fhint_loaded` | action | Pro wires its modules here (priority 20), after checking this plugin's version. |
| `fhint_limits` | filter | Plan ceilings (`App\Core\Limits`). Pro sets every one to 0 = unlimited. |
| `fhint_schema_document` | filter `( null, $context )` | Return a JSON-LD document (with `@graph`) to print instead of the free LocalBusiness markup; `null` keeps it. `$context` = `{ post_id, url, is_front_page }`. Feeds and embeds never print. Pro's Schema Manager uses it from Step 5 (`schema.output`). |
| `fhint_schema_placement` | filter `( 'head' )` | `head` (wp_head) or `footer` (wp_footer, before `</body>`). |
| `fhint_upgrade_url` | filter | Where "Upgrade to Pro" links (`window.FHINT.upgrade_url`). |
| `fhint_admin_bootstrap_data` | filter | Pro adds `pro: { version, rest_url, features }` to `window.FHINT`, read by `src/admin/lib/pro.js`. The app's own keys cannot be removed or overwritten. Page source — never a secret. |

A Pro need that none of these covers gets one new, narrow, named hook,
listed here — not a general registry.

## Feature keys

| Key | Screen | Without Pro | With Pro |
|---|---|---|---|
| `reviews.templates` | Reviews sidebar | `TemplatesCard` (upsell, sample templates) | `ProTemplatesCard` (placeholder: reads `GET fhint-pro/v1/status`) |
| `posts.ai` | Posts: "Write with AI" (header button and composer tab), "Make with AI" photo | disabled, `PRO` tag | — |
| `posts.schedule` | Posts composer: "Schedule" under When to publish; `scheduled` status | disabled, `PRO` tag | — |
| `posts.csv` | Posts: "Schedule with a CSV file" | disabled, `PRO` tag | — |
| `posts.blog` | Posts: "Share your blog on Google" card | disabled, `PRO` tag | — |

The posts table already has what Pro's posts need: `status` `scheduled`,
`scheduled_at`, and `source` (`ai`, `csv`, `blog` — allowed on a request
once Pro adds them through the `fhint_post_sources` filter).
| `schema.business` | Schema → 01 Business schema | The five-tab screen, locked, filled with the free markup | Editable tab; Pro's `fhint-pro/v1/schema/*` routes |
| `schema.locations` · `schema.services` · `schema.website` · `schema.settings` | Schema tabs 02–05 | "Pro" | Each when its step ships (docs/SCHEMA-PLAN.md) |
| `schema.output` | Front-end markup | Free LocalBusiness markup | Pro's per-page graph replaces it |

The Schema Manager's tables (`fhint_schema_entities`, `…_service_providers`,
`…_service_areas`, `…_page_index`) are created and dropped by this plugin
and written only by Pro.

