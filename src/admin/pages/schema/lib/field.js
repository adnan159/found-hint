/**
 * Rules for one schema field: where its value stands, and how it is laid
 * out. Used by `FieldRow` and its parts.
 */

/** Fields long enough to take a whole row wherever they appear. */
export const WIDE_FIELDS = [
  "description",
  "hours",
  "social",
  "images",
  "areas_served",
];

/** The price ranges schema.org's `priceRange` is usually given as. */
export const PRICE_RANGES = ["$", "$$", "$$$", "$$$$"];

/**
 * Where a field's value stands.
 *
 * - `fromGoogle`: the value is Google's (read-only until Edit, or always
 *   for `google_readonly`).
 * - `edited`: the website has, or is about to have, its own value.
 * - `readOnly`: the control cannot be typed in.
 * - `canSwitch`: Edit / Use Google's value is on offer.
 * - `tone`: `missing`, `locked` or `open` — the control's look.
 *
 * @param {Object}  field
 * @param {Object}  flags
 * @param {boolean} flags.editing Opened for editing.
 * @param {boolean} flags.locked  The whole tab is read-only.
 * @param {boolean} flags.missing Required and empty.
 * @param {string}  [flags.error] A server error.
 * @return {Object} The status.
 */
export function fieldStatus(field, { editing, locked, missing, error }) {
  const fromGoogle =
    field.source === "google" || field.source === "google_readonly";
  const edited = field.source === "override" || editing;
  const readOnly =
    locked || (fromGoogle && !editing) || field.source === "google_readonly";

  return {
    fromGoogle,
    edited,
    readOnly,
    canSwitch:
      !locked &&
      Boolean(field.gbp) &&
      field.source !== "google_readonly" &&
      field.google_value !== null,
    tone: missing || error ? "missing" : readOnly ? "locked" : "open",
  };
}

/**
 * The requirement badge to show: a storefront-only requirement reads as
 * optional for a service-area business.
 */
export function badgeTone(badge, visitMode) {
  return badge === "storefront" && visitMode === "service_area"
    ? "optional"
    : badge;
}
