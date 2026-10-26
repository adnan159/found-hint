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
| `fhint_admin_bootstrap_data` | filter | Pro adds `pro: { version, rest_url, features }` to `window.FHINT`, read by `src/admin/lib/pro.js`. The app's own keys cannot be removed or overwritten. Page source — never a secret. |

A Pro need that none of these covers gets one new, narrow, named hook,
listed here — not a general registry.

## Feature keys

| Key | Screen | Without Pro | With Pro |
|---|---|---|---|
| `reviews.templates` | Reviews sidebar | `TemplatesCard` (upsell, sample templates) | `ProTemplatesCard` (placeholder: reads `GET fhint-pro/v1/status`) |
