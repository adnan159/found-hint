import { __ } from "@wordpress/i18n";

/** Plugin and sidebar names: the area id the editor stores is both. */
const PLUGIN = "fhint-gbp-posting";
const SIDEBAR = "gbp-posting";
const AREA = `${PLUGIN}/${SIDEBAR}`;

/** FoundHint's accent (CLAUDE.md, Brand). */
const BRAND = "#FF6B35";

/**
 * Put a "GBP Posting" button in the editor's top bar, beside its other
 * pinned icons.
 *
 * The editor has no public API for a bare header button; a plugin sidebar
 * is what puts a pinned icon there. So the button is a sidebar that, the
 * moment it opens, closes again (putting back whichever sidebar was open)
 * and calls `open()` with the post being edited — one click, one popup.
 *
 * Built with WordPress's own React (`wp.element`), since it renders inside
 * the editor. Does nothing outside the block editor.
 *
 * @param {Function} open Open the popup for a post id.
 */
export function registerToolbarButton(open) {
  const wp = window.wp;
  const PluginSidebar = wp?.editor?.PluginSidebar;

  if (!wp?.plugins?.registerPlugin || !PluginSidebar || !wp?.data) {
    return;
  }

  const el = wp.element.createElement;
  // A page with lines and a "+" badge — a new post — in FoundHint's orange.
  const stroke = {
    fill: "none",
    stroke: BRAND,
    strokeWidth: 1.6,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  const icon = el(
    "svg",
    { viewBox: "0 0 24 24", width: 24, height: 24, "aria-hidden": true },
    el("path", {
      ...stroke,
      d: "M14 19.5H6.5A1.5 1.5 0 0 1 5 18V4.5A1.5 1.5 0 0 1 6.5 3h7l4.5 4.5V12",
    }),
    el("path", { ...stroke, d: "M13.5 3v3a1.5 1.5 0 0 0 1.5 1.5h3" }),
    el("path", { ...stroke, d: "M8 10h6M8 13h6M8 16h3" }),
    el("circle", { ...stroke, cx: 17.5, cy: 17.5, r: 4 }),
    el("path", { ...stroke, d: "M17.5 15.5v4M15.5 17.5h4" }),
  );

  wp.plugins.registerPlugin(PLUGIN, {
    icon,
    render: () =>
      el(
        PluginSidebar,
        {
          name: SIDEBAR,
          title: __("GBP Posting", "foundhint-local-seo"),
          icon,
        },
        el(
          "p",
          { style: { padding: "16px" } },
          __("Opening the GBP Posting window…", "foundhint-local-seo"),
        ),
      ),
  });

  // The store keeps the open sidebar per scope: "core" in current WordPress,
  // "core/edit-post" before 6.6.
  const scopes = ["core", "core/edit-post"];
  const previous = {};
  let handling = false;

  // Which sidebar is open now, so the first click can put it back even if
  // nothing in the editor has changed since it loaded.
  const ui = () => wp.data.select("core/interface");

  scopes.forEach((scope) => {
    previous[scope] = ui()?.getActiveComplementaryArea?.(scope) ?? null;
  });

  wp.data.subscribe(() => {
    if (handling || !ui()?.getActiveComplementaryArea) {
      return;
    }

    scopes.forEach((scope) => {
      const active = ui().getActiveComplementaryArea(scope);

      if (active !== AREA) {
        previous[scope] = active;
        return;
      }

      handling = true;

      const back = previous[scope];
      const actions = wp.data.dispatch("core/interface");

      if (back) {
        actions.enableComplementaryArea(scope, back);
      } else {
        actions.disableComplementaryArea(scope);
      }

      handling = false;
      open(wp.data.select("core/editor").getCurrentPostId());
    });
  });
}

export default registerToolbarButton;
