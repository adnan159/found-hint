import { __, sprintf } from "@wordpress/i18n";

// What the server calls a step, a field and a reason, in the owner's words.
export const STEP_TITLES = {
  location: () => __("Business details", "foundhint-local-seo"),
  attributes: () => __("Links and attributes", "foundhint-local-seo"),
};

const FIELD_NAMES = {
  name: () => __("Business name", "foundhint-local-seo"),
  description: () => __("Description", "foundhint-local-seo"),
  website: () => __("Website", "foundhint-local-seo"),
  phone: () => __("Phone number", "foundhint-local-seo"),
  categories: () => __("Categories", "foundhint-local-seo"),
  hours: () => __("Business hours", "foundhint-local-seo"),
  special_hours: () => __("Special hours", "foundhint-local-seo"),
  services: () => __("Services", "foundhint-local-seo"),
};

export function fieldName(field) {
  if (FIELD_NAMES[field]) {
    return FIELD_NAMES[field]();
  }

  const [kind, id] = String(field).split(".");

  if (kind === "social" && id) {
    return sprintf(
      /* translators: %s: a social network, such as facebook. */
      __("%s link", "foundhint-local-seo"),
      id.charAt(0).toUpperCase() + id.slice(1),
    );
  }

  return id ?? field;
}

export const SKIP_REASONS = {
  empty_here: () =>
    __(
      "Empty here, so Google keeps what it has. FoundHint never clears a field on Google.",
      "foundhint-local-seo",
    ),
  no_google_id: () =>
    __(
      "Typed by hand. Choose the category from Google's list to send it.",
      "foundhint-local-seo",
    ),
  not_allowed: () =>
    __("Google does not let this listing change it.", "foundhint-local-seo"),
  not_on_google: () =>
    __(
      "Google has no place for it. It stays in your website markup.",
      "foundhint-local-seo",
    ),
};
