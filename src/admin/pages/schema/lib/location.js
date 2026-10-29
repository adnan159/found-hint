import { __, _n, sprintf } from "@wordpress/i18n";

/** The Location tab's clean draft. */
export const EMPTY_LOCATION_DRAFT = { overrides: {}, reset: [] };

/** The field groups, in the order they are shown. */
export const LOCATION_GROUPS = [
  ["branch", () => __("Branch", "foundhint-local-seo")],
  ["address", () => __("Address", "foundhint-local-seo")],
  ["contact", () => __("Contact", "foundhint-local-seo")],
  ["hours", () => __("Hours", "foundhint-local-seo")],
];

// Settings kept beside the field overrides.
const SETTINGS = ["parent", "status", "placement", "post_ids"];

/** Whether the draft holds any change. */
export function isLocationDraftDirty(draft) {
  return (
    Object.keys(draft.overrides).length > 0 ||
    draft.reset.length > 0 ||
    SETTINGS.some((key) => draft[key] !== undefined)
  );
}

/** What Google needs for a branch, by key: those still empty. */
export function missingLocationFields(values) {
  return ["name", "street_address", "locality", "country"].filter(
    (key) => String(values[key] ?? "").trim() === "",
  );
}

/** Where a branch prints, for its button: off, everywhere, or N pages. */
export function pagesLine(branch) {
  if (branch.status === "inactive") {
    return __("Off", "foundhint-local-seo");
  }

  // The free markup: every location on every page.
  if (branch.pages === null) {
    return __("On every page", "foundhint-local-seo");
  }

  return sprintf(
    /* translators: %d: number of pages. */
    _n("On %d page", "On %d pages", branch.pages, "foundhint-local-seo"),
    branch.pages,
  );
}
