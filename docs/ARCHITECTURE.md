# Architecture

See [CLAUDE.md](../CLAUDE.md) first — this file expands on it, it doesn't
replace it. It also assumes familiarity with `local-seo/docs/ARCHITECTURE.md`,
which this repo's PHP layering is carried over from.

## Layers and dependency direction

```
Presentation  →  Application  →  Domain
      ↘              ↘
        Infrastructure
```

| Layer | Path | Holds | Must never |
|---|---|---|---|
| Domain | `includes/Domain/` | entities, value objects, validation, repository *interfaces* | touch `$wpdb`, REST, admin, React |
| Application | `includes/Application/` | use-case services, sanitisation, plan limits | render markup, read `$_POST` |
| Infrastructure | `includes/Infrastructure/` | repositories, cache, logging, WordPress glue | contain business rules |
| Presentation | `includes/Presentation/` | admin screens, REST controllers | contain business rules or run SQL |

All four directories exist today; only `Presentation/Admin/` has real
classes in it (`Menu`, `Enqueue`, `AdminServiceProvider`). The rest hold a
`.gitkeep` — this is intentional scaffolding, not an oversight.

## Boot sequence

```
found-hint.php
 ├─ define constants (FHINT_VERSION, FHINT_DB_VERSION, paths)
 ├─ require vendor/autoload.php (Composer PSR-4: FHINT\ → includes/)
 ├─ register activation / deactivation hooks → Infrastructure\WordPress\Lifecycle
 └─ on plugins_loaded → \FHINT\Plugin::instance()->boot()
      ├─ load_textdomain()
      ├─ Capabilities::register()          (grants manage_fhint)
      ├─ instantiate providers             (filter: fhint_service_providers)
      ├─ provider->register() for ALL      (bind only — no hooks yet)
      ├─ Extensions::register_extensions() (action: fhint_register_extensions)
      ├─ provider->boot() for ALL          (attach hooks)
      └─ action: fhint_loaded
```

Same shape and same reasoning as `local-seo`: all `register()` before any
`boot()` so providers never depend on load order; extensions fire between
them so a future Pro add-on can contribute after core fills the registries
and before anything reads them; activation installs directly rather than
through a hook, because on activation the plugin file loads *after*
`plugins_loaded`, so no provider has booted yet and a listener would never
run.

## Service providers

| Provider | Registers | Status |
|---|---|---|
| `Presentation\Admin\AdminServiceProvider` | `Menu`, `Enqueue` | done (scaffold) |
| `Infrastructure\Database\DatabaseServiceProvider` | repositories, installer, migrator | not built |
| `Application\ApplicationServiceProvider` | Business/Location/Service/NAP/Limits services | not built |
| `Presentation\REST\RestServiceProvider` | REST controllers, `rest_api_init` wiring | not built |

Add a provider via the `fhint_service_providers` filter, or by adding
its class to `default_providers()` in `includes/Plugin.php` for one shipped
with core.

## Container

`FHINT\Support\Container` — identical to `local-seo`'s: `singleton()`,
`bind()`, `instance()`, `get()`, `has()`, no reflection autowiring, circular
dependencies return `null` rather than recursing. Consumers depend on
**interfaces** once `Domain/*RepositoryInterface` classes exist, so a
repository can be decorated by a future Pro plugin without core knowing.

## Extension registries

`Support\Extensions` holds named `Support\Registry` instances:
`schema_providers`, `audit_rules`, `fix_handlers`, `blocks`,
`map_providers`, `admin_pages`, `rest_routes`. Unknown names are created on
demand. See `local-seo/docs/EXTENDING.md` for the full contract these
registries follow (items may be objects or factories; a factory is
resolved on first read).

## Data flow, write path (target shape, once built)

```
React form (src/admin/pages/*)
  → RTK Query mutation (src/admin/store/api/*Api.js)
  → REST controller        args: sanitize_callback + validate_callback
  → Application service    Input:: sanitisation, partial-update merge
  → Domain entity          validate() → ValidationResult (error codes)
  → Repository              prepared SQL, transaction, cache flush
  → Result                  → REST envelope or WP_Error with per-field codes
  → React form               codes → translated messages under each input
```

## Data flow, read path (target shape, once built)

```
Business + Location + OpeningHours
  → NapService (resolved once per request, refreshed on fhint_data_changed)
  → Schema engine / audit / REST
```

A single `NapService` should be the only reader of name/address/phone/
website/hours/logo, exactly as in `local-seo` — nothing else may hold its
own copy.

## Front-end guarantees (unchanged targets from local-seo)

- Admin code and assets are gated on `is_admin()` and the exact hook suffix
  `Menu` captured, not a generic `is_admin()` check alone.
- DDL never runs on a front-end request.
- Audits never run on a front-end request.
- No external HTTP during page rendering.

## Where this deliberately differs from local-seo

1. **PHP root is `includes/`, not `src/`.** `src/` is the Vite-built admin
   frontend (`src/admin/`). Composer PSR-4 replaces the hand-rolled
   `Autoloader.php`.
2. **Admin frontend is a client-routed React SPA** (Redux Toolkit + RTK
   Query + shadcn/ui, one real WP admin page, `react-router`'s
   `createHashRouter`), not `@wordpress/element` + server-registered pages
   per screen. See CLAUDE.md's "Admin React SPA" section for the full
   rationale.
3. **`assets/build/` is gitignored**, not committed — `npm run
   plugin:prepare` / `plugin:publish` produce the distributable zip,
   mirroring `abandoned-cart-recovery-for-woocommerce`'s release flow
   rather than `local-seo`'s committed-build approach.
