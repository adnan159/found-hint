# FoundHint and FoundHint Pro

**All UI is in this plugin. FoundHint Pro (`../found-hint-premium`) is
server-side only** — REST routes, data, background jobs, limits. It has
no admin page, script or style of its own, and it never edits this plugin.

## How a Pro feature is built

1. **Pro (PHP):** the routes under `fhint-premium/v1` (guarded by this
   plugin's `manage_fhint` capability), tables, jobs. When the feature
   works, add its key to `FHINTPREMIUM\App\Core\Features::active()`.
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
server: without Pro, the `fhint-premium/v1` routes do not exist.

## Hooks this plugin offers Pro

| Hook | Kind | What for |
|---|---|---|
| `fhint_loaded` | action | Pro wires its modules here (priority 20), after checking this plugin's version. |
| `fhint_limits` | filter | Plan ceilings (`App\Core\Limits`). Pro sets every one to 0 = unlimited. |
| `fhint_schema_document` | filter `( null, $context )` | Return a JSON-LD document (with `@graph`) to print instead of the free LocalBusiness markup; `null` keeps it. `$context` = `{ post_id, url, is_front_page }`. Feeds and embeds never print. Premium's Schema Manager uses it while `schema.output` is on: one graph per page, or an empty one when "Add to my site header" is off. |
| `fhint_schema_placement` | filter `( 'head' )` | `head` (wp_head) or `footer` (wp_footer, before `</body>`). |
| `fhint_upgrade_url` | filter | Where "Upgrade to Pro" links (`window.FHINT.upgrade_url`). |
| `fhint_admin_bootstrap_data` | filter | Pro adds `pro: { version, rest_url, features }` to `window.FHINT`, read by `src/admin/lib/pro.js`. The app's own keys cannot be removed or overwritten. Page source — never a secret. |

A Pro need that none of these covers gets one new, narrow, named hook,
listed here — not a general registry.

## Feature keys

| Key | Screen | Without Pro | With Pro |
|---|---|---|---|
| `reviews.templates` | Reviews sidebar | `TemplatesCard` (upsell, sample templates) | `ProTemplatesCard` (placeholder: reads `GET fhint-premium/v1/status`) |
| `posts.ai` | Posts: "Write with AI" (header button and composer tab), "Make with AI" photo | disabled, `PRO` tag | — |
| `posts.schedule` | Posts composer: "Schedule" under When to publish, the "Publish on" picker | disabled, `PRO` tag; a post already scheduled shows its time read-only and "Needs FoundHint Premium to send", and can still be published now, changed or cancelled (free `POST /posts/{id}/unschedule`) | The picker; saving calls `POST fhint-premium/v1/posts/{id}/schedule` `{ scheduled_at }` (site wall time). Shipped in Premium: the route, a 5-minute WP-Cron sweep (`fhintpremium_send_due_posts`) that claims each due post (`sending`) and sends it once (see `docs/POSTS-SCHEDULE-PLAN.md`) |
| `posts.blog` | Posts: "Share your blog on Google" card — a switch; a "GBP Posting" link after View under each published blog post (Posts → All Posts) that opens the composer on `#/posts?share=<id>`, and a "GBP Posting" button in the block editor's top bar that opens the same composer in a popup there (`src/editor`) | switch off and disabled, `PRO` tag; no link | Shipped: `fhint-premium/v1/posts/blog-sharing` (GET/PUT `{ enabled }`, stored in the free setting `posts.blog_sharing`), `posts/blog/{id}` (the blog post as a draft); answers `fhint_blog_sharing_enabled`; adds source `blog` |

The posts table already has what Pro's posts need: `status` `scheduled`,
`scheduled_at`, and `source` (`ai`, `csv`, `blog` — allowed on a request
once Pro adds them through the `fhint_post_sources` filter).
| `schema.business` | Schema → 01 Organization and 02 LocalBusiness (main business) | The six-tab screen, locked, filled with the free markup | Editable tabs, their switches and the main-business choice; Premium's `fhint-premium/v1/schema/*` routes |
| `schema.locations` · `schema.services` | Schema tabs 03–04 | The tab locked, filled with the free markup | Editable tabs (shipped): the Locations list, setup and branch editor; services |
| `schema.website` · `schema.settings` | Schema tabs 05–06 | "Pro" (05); "Who publishes it" only (06) | Website structure rows; header output, live check, What goes where, SEO plugins (shipped) |
| `schema.output` | Front-end markup | Free LocalBusiness markup | Premium's per-page graph replaces it (shipped); "Add to my site header" off prints nothing |

The Schema Manager's tables (`fhint_schema_entities`, `…_service_providers`,
`…_service_areas`, `…_page_index`) are created and dropped by this plugin
and written only by Pro.

