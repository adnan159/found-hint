import { __ } from "@wordpress/i18n";

/**
 * The schema tabs: key, title, and what the tab describes — shown in its
 * button in the tab bar, so the tab's own panel needs no intro.
 *
 * Organization (the brand) and LocalBusiness (the place) are separate tabs.
 */
export const TABS = [
  [
    "organization",
    () => __("Organization", "foundhint-local-seo"),
    () =>
      __(
        "Who owns or runs the business, however many locations it has.",
        "foundhint-local-seo",
      ),
  ],
  [
    "localbusiness",
    () => __("LocalBusiness", "foundhint-local-seo"),
    () =>
      __(
        "A business at a physical location, with its address, hours and category.",
        "foundhint-local-seo",
      ),
  ],
  [
    "locations",
    () => __("Locations", "foundhint-local-seo"),
    () =>
      __(
        "Each branch: its own address, phone, hours and page, linked to your business.",
        "foundhint-local-seo",
      ),
  ],
  [
    "services",
    () => __("Services", "foundhint-local-seo"),
    () =>
      __(
        "Each service you offer, linked to the business or branch that provides it.",
        "foundhint-local-seo",
      ),
  ],
  [
    "website",
    () => __("Website structure", "foundhint-local-seo"),
    () =>
      __(
        "Tells Google what your site is, what each page is for and how pages connect.",
        "foundhint-local-seo",
      ),
  ],
  [
    "settings",
    () => __("Settings", "foundhint-local-seo"),
    () =>
      __(
        "Where your schema prints, and how it works with your SEO plugin.",
        "foundhint-local-seo",
      ),
  ],
];

/**
 * Tabs with an on/off switch: on prints its schema; off keeps every detail
 * and prints nothing. Settings has none.
 */
export const SWITCHED = [
  "organization",
  "localbusiness",
  "locations",
  "services",
  "website",
];
