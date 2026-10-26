/**
 * Values localized onto the page by Admin\Enqueue.
 *
 * Read through these helpers rather than touching `window.FHINT` directly,
 * so a missing key is a defined fallback in one place instead of a
 * `cannot read property of undefined` at some random call site — which is
 * what happens in the Vite dev server if the PHP side has not run.
 */
const bootstrap = typeof window !== "undefined" ? (window.FHINT ?? {}) : {};

const reference = bootstrap.reference ?? {};

export const businessTypes = reference.business_types ?? [];
export const locationStatuses = reference.location_statuses ?? [
  "active",
  "inactive",
  "temporarily_closed",
  "permanently_closed",
];
export const serviceStatuses = reference.service_statuses ?? [
  "active",
  "inactive",
];
export const timezones = reference.timezones ?? [];
export const defaultCurrency = reference.currency ?? "";
export const pluginVersion = bootstrap.version ?? "";
