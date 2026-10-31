import { __ } from "@wordpress/i18n";

/** The Business tab's clean draft. */
export const EMPTY_BUSINESS_DRAFT = { overrides: {}, reset: [], extras: {} };

/** The field groups, in the order they are shown. */
export const BUSINESS_GROUPS = [
  ["info", () => __("Business information", "foundhint-local-seo")],
  ["identity", () => __("About the business", "foundhint-local-seo")],
  ["contact", () => __("Contact point", "foundhint-local-seo")],
  ["address", () => __("Address", "foundhint-local-seo")],
  ["reach", () => __("Hours and reach", "foundhint-local-seo")],
];

/**
 * Fields an Organization does not print: it is the brand, not a place you
 * visit, so it has no hours, price range, coordinates or map. Its address
 * and the areas it serves are optional (QA D6).
 */
export const NOT_FOR_ORGANIZATION = [
  "hours",
  "price_range",
  "latitude",
  "longitude",
  "map_url",
];

/** Contact point types, as schema.org's `contactType` values. */
export const CONTACT_TYPES = [
  ["customer support", () => __("Customer support", "foundhint-local-seo")],
  ["technical support", () => __("Technical support", "foundhint-local-seo")],
  ["sales", () => __("Sales", "foundhint-local-seo")],
  ["billing support", () => __("Billing support", "foundhint-local-seo")],
  ["bill payment", () => __("Bill payment", "foundhint-local-seo")],
  ["reservations", () => __("Reservations", "foundhint-local-seo")],
  ["emergency", () => __("Emergency", "foundhint-local-seo")],
];

/** Address parts that mean nothing for a service-area business. */
export const STOREFRONT_ONLY = [
  "street_address",
  "postal_code",
  "latitude",
  "longitude",
];

/**
 * Whether the draft holds any change: a non-empty list or map, or any
 * other key set at all.
 */
export function isBusinessDraftDirty(draft) {
  return Object.keys(draft).some((key) =>
    Array.isArray(draft[key])
      ? draft[key].length > 0
      : draft[key] && typeof draft[key] === "object"
        ? Object.keys(draft[key]).length > 0
        : draft[key] !== undefined,
  );
}

function blank(value) {
  return Array.isArray(value)
    ? value.length === 0
    : String(value ?? "").trim() === "";
}

/**
 * The required fields still empty. An Organization needs a name; a local
 * business its address too, or — serving customers where they are — the
 * areas it serves instead.
 *
 * @param {Object}  values       Field values by key.
 * @param {boolean} organization The Organization kind.
 * @param {string}  visitMode    `storefront` or `service_area`.
 * @return {string[]} Keys.
 */
export function missingBusinessFields(values, organization, visitMode) {
  const required = organization
    ? ["name"]
    : visitMode === "service_area"
      ? ["name", "areas_served"]
      : ["name", "street_address", "locality", "country"];

  return required.filter((key) => blank(values[key]));
}
