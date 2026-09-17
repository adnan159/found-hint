import { __, sprintf } from "@wordpress/i18n";

/**
 * Domain error codes -> human sentences.
 *
 * The server deliberately returns machine codes ("business.name.required")
 * and never prose, so the wording lives here where it can be translated and
 * changed without touching validation. Every code the PHP entities can emit
 * has an entry; see includes/API/README.md for the authoritative list.
 */
const MESSAGES = {
  // Business.
  "business.name.required": () =>
    __("Enter the name customers know you by.", "found-hint"),
  "business.name.too_long": () =>
    __("That name is too long — 255 characters at most.", "found-hint"),
  "business.legal_name.too_long": () =>
    __("That legal name is too long — 255 characters at most.", "found-hint"),
  "business.type.invalid": () =>
    __("Choose a business type from the list.", "found-hint"),
  "business.category.too_long": () =>
    __("That category is too long — 150 characters at most.", "found-hint"),
  "business.email.invalid": () =>
    __("That does not look like an email address.", "found-hint"),
  "business.phone.invalid": () =>
    __("That does not look like a phone number.", "found-hint"),
  "business.website.invalid": () =>
    __("Enter a full web address, starting with https://", "found-hint"),
  "business.logo_url.invalid": () =>
    __("Enter a full image address, starting with https://", "found-hint"),
  "business.price_range.too_long": () =>
    __("Keep the price range short, like $$.", "found-hint"),
  "business.founding_date.invalid": () =>
    __("Enter a real date in YYYY-MM-DD form.", "found-hint"),
  "social.url.invalid": () =>
    __("Enter the full profile address, starting with https://", "found-hint"),

  // Location.
  "location.name.required": () =>
    __("Give this location a name, such as Downtown.", "found-hint"),
  "location.name.too_long": () =>
    __("That name is too long — 255 characters at most.", "found-hint"),
  "address.too_long": () =>
    __("That is too long — 255 characters at most.", "found-hint"),
  "address.country.invalid": () =>
    __("Use a two-letter country code, such as US or BD.", "found-hint"),
  "location.latitude.invalid": () =>
    __("Latitude must be between -90 and 90.", "found-hint"),
  "location.longitude.invalid": () =>
    __("Longitude must be between -180 and 180.", "found-hint"),
  "location.email.invalid": () =>
    __("That does not look like an email address.", "found-hint"),
  "location.phone.invalid": () =>
    __("That does not look like a phone number.", "found-hint"),
  "location.website.invalid": () =>
    __("Enter a full web address, starting with https://", "found-hint"),
  "location.timezone.invalid": () =>
    __("Choose a time zone from the list.", "found-hint"),
  "location.status.invalid": () =>
    __("Choose a status from the list.", "found-hint"),

  // Opening hours.
  "hours.day.invalid": () => __("That is not a valid day.", "found-hint"),
  "hours.open_time.required": () =>
    __("Add an opening time, or mark the day closed.", "found-hint"),
  "hours.close_time.required": () =>
    __("Add a closing time, or mark the day closed.", "found-hint"),
  "hours.range.zero_length": () =>
    __("Opening and closing time cannot be the same.", "found-hint"),
  "hours.periods.overlap": () =>
    __("These times overlap each other.", "found-hint"),

  // Service.
  "service.name.required": () => __("Give this service a name.", "found-hint"),
  "service.name.too_long": () =>
    __("That name is too long — 255 characters at most.", "found-hint"),
  "service.slug.required": () =>
    __("A service needs a URL slug.", "found-hint"),
  "service.slug.too_long": () =>
    __("That slug is too long — 200 characters at most.", "found-hint"),
  "service.price.invalid": () => __("Enter a number.", "found-hint"),
  "service.price.negative": () =>
    __("A price cannot be negative.", "found-hint"),
  "service.currency.required_with_price": () =>
    __("Choose a currency for this price.", "found-hint"),
  "service.currency.invalid": () =>
    __("Use a three-letter currency code, such as USD.", "found-hint"),
  "service.url.invalid": () =>
    __("Enter a full web address, starting with https://", "found-hint"),
  "service.image_url.invalid": () =>
    __("Enter a full image address, starting with https://", "found-hint"),
  "service.status.invalid": () =>
    __("Choose a status from the list.", "found-hint"),

  // Schema. Not validation errors: these describe why the markup is not
  // being published, or what would make it better.
  "schema.business.missing": () =>
    __("Add your business details before publishing markup.", "found-hint"),
  "schema.location.missing": () =>
    __("Add a location before publishing markup.", "found-hint"),
  "schema.name.missing": () => __("A business name is required.", "found-hint"),
  "schema.address.incomplete": () =>
    __(
      "The address needs a street, a city and a country at least.",
      "found-hint",
    ),
  "schema.location.permanently_closed": () =>
    __(
      "This location is marked permanently closed, so nothing is published for it.",
      "found-hint",
    ),
  "schema.phone.missing": () => __("No phone number.", "found-hint"),
  "schema.website.missing": () => __("No website address.", "found-hint"),
  "schema.logo.missing": () => __("No logo.", "found-hint"),
  "schema.description.missing": () => __("No description.", "found-hint"),
  "schema.geo.missing": () => __("No map coordinates.", "found-hint"),
  "schema.hours.missing": () => __("No opening hours set.", "found-hint"),
};

/**
 * Turn one domain code into a sentence.
 *
 * An unknown code returns the code itself rather than an empty string: a
 * visible "service.colour.invalid" tells whoever sees it exactly which
 * entry is missing, where a blank space would just look like a bug.
 *
 * @param {string} code Machine error code.
 * @return {string} Human-readable message.
 */
export function messageForCode(code) {
  const entry = MESSAGES[code];

  return entry ? entry() : code;
}

/**
 * Per-field messages from a rejected request.
 *
 * Handles both documented error shapes: this plugin's own validation
 * (`data.fields`, machine codes) and WordPress's argument validation
 * (`data.params`, ready sentences). A form has to cope with both, because
 * which one it gets depends on whether the value failed the route schema or
 * the domain rules.
 *
 * @param {object} error RTK Query error.
 * @return {Object<string,string>} Field name -> message.
 */
export function fieldErrors(error) {
  const data = error?.data?.data;

  if (data?.fields) {
    return Object.fromEntries(
      Object.entries(data.fields).map(([field, codes]) => [
        field,
        messageForCode(Array.isArray(codes) ? codes[0] : codes),
      ]),
    );
  }

  if (data?.params) {
    return { ...data.params };
  }

  return {};
}

/**
 * The single sentence to show when a request fails.
 *
 * @param {object} error RTK Query error.
 * @return {string} Human-readable message.
 */
export function errorMessage(error) {
  if (!error) {
    return "";
  }

  const code = error?.data?.code;

  const known = {
    fhint_not_logged_in: () =>
      __(
        "Your session has expired. Reload the page and sign in.",
        "found-hint",
      ),
    fhint_forbidden: () =>
      __("You do not have permission to change this.", "found-hint"),
    fhint_business_required: () =>
      __("Add your business details first.", "found-hint"),
    fhint_location_not_found: () =>
      __("That location no longer exists.", "found-hint"),
    fhint_service_not_found: () =>
      __("That service no longer exists.", "found-hint"),
    fhint_save_failed: () =>
      __("The changes could not be saved. Try again.", "found-hint"),
    fhint_nothing_to_reorder: () => __("Nothing to reorder.", "found-hint"),
    fhint_validation_failed: () =>
      __("Check the highlighted fields and try again.", "found-hint"),
  };

  if (known[code]) {
    return known[code]();
  }

  if (code === "fhint_location_limit_reached") {
    return sprintf(
      /* translators: %d: number of locations included in the plan. */
      __("Your plan includes %d location.", "found-hint"),
      error?.data?.data?.limit ?? 1,
    );
  }

  if (code === "fhint_service_limit_reached") {
    return sprintf(
      /* translators: %d: number of services included in the plan. */
      __("Your plan includes %d services.", "found-hint"),
      error?.data?.data?.limit ?? 5,
    );
  }

  return (
    error?.data?.message || __("Something went wrong. Try again.", "found-hint")
  );
}
