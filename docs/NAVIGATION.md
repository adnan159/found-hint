# Navigation

This plugin's target IA, carried over from two prior artifacts and now the
thing being built rather than a proposal:

1. `local-seo/docs/NAVIGATION-PROPOSAL.md` — the full menu tree, page-by-page
   notes, and open questions. Read that file for detail; it isn't
   duplicated here.
2. The FoundHint HTML prototype (`~/Downloads/FoundHint Local SEO
   Prototype.html`) — concrete visual/copy decisions. See project memory
   (`project_ui_prototype_foundhint`, `reference_foundhint_prototype_file`)
   for what was extracted from it: brand tokens, the dashboard card
   composition, the Free/Pro gating pattern, copy tone.

## Collapsed sidebar (what `includes/Admin/Menu.php` registers today)

```
FoundHint
├── Dashboard
├── Business
├── Locations
├── Services
├── Schema
├── SEO Audit
├── Google Business Profile
└── Settings
```

This is a subset of the full proposed tree — Landing Pages, Ranking Grid,
Performance, and a standalone Recommendations screen are proposed but not
yet built. The tree lives in the plugin's own sidebar
(`src/admin/layouts/root/components/Sidebar.jsx`) and `routes.jsx`;
WordPress itself shows a single FoundHint menu entry with no submenus,
which opens the dashboard.

## Free/Pro gating pattern (from the prototype, apply when Pro exists)

Do **not** hide a Pro feature or its nav entry. Show the real shape with
sample/locked data instead:

- A `PRO` badge next to the nav label.
- A gated table's rows render for real, with locked rows greyed out,
  cell text "PRO ONLY", and an "Unlock" button — not hidden.
- Pro-only dashboard cards render with sample numbers labeled "PRO
  FEATURE" plus one line explaining what real data Pro would show, and an
  "Upgrade to Pro" button.

This mirrors `local-seo`'s existing `LimitsService` / `local_seo_limits`
filter pattern (never hard-code a limit check outside that service) — the
UI pattern above is the presentation-layer expression of the same rule.

## Brand

Primary accent `#FF6B35` (orange), dark/near-black sidebar — already wired
into `src/admin/index.css`'s `:root` and `.dark` tokens.
