import { __ } from "@wordpress/i18n";

/** How each "Who publishes it" choice reads. */
export const MODE_LABELS = {
  auto: () => __("Automatic", "foundhint-local-seo"),
  plugin: () => __("FoundHint publishes it", "foundhint-local-seo"),
  seo_plugin: () => __("My SEO plugin publishes it", "foundhint-local-seo"),
  disabled: () => __("Nobody publishes it", "foundhint-local-seo"),
};

export const MODE_HINTS = {
  auto: () =>
    __(
      "FoundHint publishes the markup unless it finds another plugin already doing it.",
      "foundhint-local-seo",
    ),
  plugin: () =>
    __(
      "Always publish, even if something else might be publishing too.",
      "foundhint-local-seo",
    ),
  seo_plugin: () =>
    __(
      "Never publish. Use this when your SEO plugin already describes the business.",
      "foundhint-local-seo",
    ),
  disabled: () =>
    __(
      "No local business markup is published from this site.",
      "foundhint-local-seo",
    ),
};
