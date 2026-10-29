import { __, _n, sprintf } from "@wordpress/i18n";

/** The kinds of place a service area can be, as schema.org types. */
export const AREA_TYPES = [
  ["City", () => __("City or town", "foundhint-local-seo")],
  ["AdministrativeArea", () => __("Region or state", "foundhint-local-seo")],
  ["Place", () => __("Named area", "foundhint-local-seo")],
  ["Country", () => __("Country", "foundhint-local-seo")],
];

export function areaTypeLabel(type) {
  const found = AREA_TYPES.find(([key]) => key === type);

  return found ? found[1]() : type;
}

const CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "INR",
  "BDT",
  "PKR",
  "AED",
  "SAR",
  "SGD",
  "MYR",
  "ZAR",
  "NZD",
];

/** The currency list, with a saved currency outside it kept choosable. */
export function currencyOptions(current) {
  return CURRENCIES.includes(current) ? CURRENCIES : [current, ...CURRENCIES];
}

/** The most a short description should run to. */
export const MAX_DESCRIPTION = 300;

/** Warnings about where the service prints, shown under the placement. */
export const PLACEMENT_WARNINGS = ["no_pages", "branch_off"];

/** The price, in a line, for the collapsed Optional details. */
export function pricingSummary(pricing) {
  const price = pricing.price || "…";

  switch (pricing.model) {
    case "none":
      return __("No price", "foundhint-local-seo");
    case "range":
      return `${price}–${pricing.max || "…"} ${pricing.currency}`;
    case "from":
      return sprintf(
        /* translators: 1: price, 2: currency. */
        __("From %1$s %2$s", "foundhint-local-seo"),
        price,
        pricing.currency,
      );
    default:
      return `${price} ${pricing.currency}`;
  }
}

/**
 * Add a place to the service areas, unless it is blank or already there
 * (same name, any case, and same type).
 *
 * @return {?Object[]} The new list, or null when nothing was added.
 */
export function withArea(areas, name, type, source = "manual") {
  const clean = name.trim();

  if (
    !clean ||
    areas.some(
      (area) =>
        area.name.toLowerCase() === clean.toLowerCase() && area.type === type,
    )
  ) {
    return null;
  }

  return [...areas, { name: clean, type, source }];
}

/**
 * The ids in their new order, after moving the one at `from` to `to`.
 *
 * @return {?number[]} Null when the move goes nowhere.
 */
export function movedIds(services, from, to) {
  if (to < 0 || to >= services.length || from === to) {
    return null;
  }

  const ids = services.map((service) => service.id);
  const [id] = ids.splice(from, 1);

  ids.splice(to, 0, id);

  return ids;
}

/**
 * A check, in words (doc §7.2, page warnings).
 *
 * @param {Object} warning `{ code, …params }` from the server.
 * @return {string} The sentence.
 */
export function warningText(warning) {
  switch (warning.code) {
    case "no_page":
      return __(
        "No service page yet. Choose the page about this service, or nothing is printed.",
        "foundhint-local-seo",
      );
    case "page_general":
      return sprintf(
        /* translators: %s: page title. */
        __(
          "“%s” is a general page. A page about only this service works better.",
          "foundhint-local-seo",
        ),
        warning.page || __("This page", "foundhint-local-seo"),
      );
    case "page_shared":
      return sprintf(
        /* translators: %s: other service names. */
        __(
          "%s already uses this page. Each service works best on its own page.",
          "foundhint-local-seo",
        ),
        (warning.services ?? []).join(", "),
      );
    case "page_unpublished":
      return __(
        "This page isn't published, so nothing will show.",
        "foundhint-local-seo",
      );
    case "page_other_host":
      return __(
        "This URL is on another site. Schema here can't describe it.",
        "foundhint-local-seo",
      );
    case "page_not_canonical":
      return sprintf(
        /* translators: %s: the page's own address. */
        __(
          "This page's own address is %s. Use that instead.",
          "foundhint-local-seo",
        ),
        warning.canonical,
      );
    case "no_pages":
      return __(
        "No pages chosen yet, so this service prints nowhere.",
        "foundhint-local-seo",
      );
    case "branch_off":
      return sprintf(
        /* translators: %s: branch name. */
        __(
          "%s is switched off in Location schema, so the service points at a branch that isn't printed.",
          "foundhint-local-seo",
        ),
        warning.branch,
      );
    default:
      return warning.code;
  }
}

/** A service's details in a line: category · provider · areas · page. */
export function serviceMetaLine(service) {
  return [
    service.meta?.category,
    service.meta?.provider,
    service.meta?.areas
      ? sprintf(
          /* translators: %d: number of areas. */
          _n("%d area", "%d areas", service.meta.areas, "foundhint-local-seo"),
          service.meta.areas,
        )
      : null,
    service.meta?.page || __("No page", "foundhint-local-seo"),
  ]
    .filter(Boolean)
    .join(" · ");
}
