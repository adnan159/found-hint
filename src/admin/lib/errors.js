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
    __("Enter the name customers know you by.", "foundhint-local-seo"),
  "business.name.too_long": () =>
    __(
      "That name is too long — 255 characters at most.",
      "foundhint-local-seo",
    ),
  "business.legal_name.too_long": () =>
    __(
      "That legal name is too long — 255 characters at most.",
      "foundhint-local-seo",
    ),
  "business.type.invalid": () =>
    __("Choose a business type from the list.", "foundhint-local-seo"),
  "business.category.too_long": () =>
    __(
      "That category is too long — 150 characters at most.",
      "foundhint-local-seo",
    ),
  "business.description.too_long": () =>
    __(
      "That description is too long. Google allows 750 characters.",
      "foundhint-local-seo",
    ),
  "business.description.has_link": () =>
    __(
      "Your description has a web link in it. Google does not allow links here, so please remove it.",
      "foundhint-local-seo",
    ),
  "business.additional_phones.too_many": () =>
    __(
      "Google keeps up to two numbers besides the main one.",
      "foundhint-local-seo",
    ),
  "business.additional_phones.same_as_main": () =>
    __(
      "That is your main number. Add a different one here.",
      "foundhint-local-seo",
    ),
  "booking.appointment.invalid": () =>
    __(
      "Enter the full web address of your booking page, starting with https://",
      "foundhint-local-seo",
    ),
  "booking.text_messaging.invalid": () =>
    __(
      "Choose the country code and enter the mobile number.",
      "foundhint-local-seo",
    ),
  "booking.whatsapp.invalid": () =>
    __(
      "Enter your WhatsApp link, such as https://wa.me/8801712345678",
      "foundhint-local-seo",
    ),
  "service_area.too_many": () =>
    __(
      "Google keeps up to 20 places in a service area.",
      "foundhint-local-seo",
    ),
  "service_area.name.too_long": () =>
    __("A place name can be 150 characters at most.", "foundhint-local-seo"),
  "opening_date.invalid": () =>
    __("Enter the month you opened, such as 2014-03.", "foundhint-local-seo"),
  "opening_date.too_far": () =>
    __(
      "Google accepts an opening date up to one year ahead.",
      "foundhint-local-seo",
    ),
  // Schema Manager — Business.
  "schema.business.kind.invalid": () =>
    __("Choose Organization or LocalBusiness.", "foundhint-local-seo"),
  "schema.business.type.invalid": () =>
    __("Choose a business type from the list.", "foundhint-local-seo"),
  "schema.business.name.required": () =>
    __("Enter the name customers know you by.", "foundhint-local-seo"),
  "schema.business.name.too_long": () =>
    __("A name can be 200 characters at most.", "foundhint-local-seo"),
  "schema.business.url.invalid": () =>
    __(
      "Enter a full web address, starting with https://",
      "foundhint-local-seo",
    ),
  "schema.business.logo.invalid": () =>
    __("Enter the full web address of your logo image.", "foundhint-local-seo"),
  "schema.business.map_url.invalid": () =>
    __(
      "Use a Google Maps link, such as https://maps.google.com/?cid=…",
      "foundhint-local-seo",
    ),
  "schema.business.telephone.invalid": () =>
    __(
      "Enter a phone number with its country code, such as +880 1712-345670.",
      "foundhint-local-seo",
    ),
  "schema.business.price_range.too_long": () =>
    __("A price range can be 100 characters at most.", "foundhint-local-seo"),
  "schema.business.description.too_long": () =>
    __("Google allows 750 characters in a description.", "foundhint-local-seo"),
  "schema.business.street_address.too_long": () =>
    __("That address line is too long.", "foundhint-local-seo"),
  "schema.business.locality.too_long": () =>
    __("That city name is too long.", "foundhint-local-seo"),
  "schema.business.region.too_long": () =>
    __("That region name is too long.", "foundhint-local-seo"),
  "schema.business.postal_code.too_long": () =>
    __("That postal code is too long.", "foundhint-local-seo"),
  "schema.business.country.invalid": () =>
    __(
      "Use the two-letter country code, such as BD or US.",
      "foundhint-local-seo",
    ),
  "schema.business.latitude.invalid": () =>
    __("Latitude is a number between -90 and 90.", "foundhint-local-seo"),
  "schema.business.longitude.invalid": () =>
    __("Longitude is a number between -180 and 180.", "foundhint-local-seo"),
  "schema.business.areas_served.too_many": () =>
    __("List up to 50 places.", "foundhint-local-seo"),
  "schema.business.social.invalid": () =>
    __(
      "Put one link per line, each starting with https://",
      "foundhint-local-seo",
    ),
  "schema.business.images.invalid": () =>
    __("Every image must be a web address.", "foundhint-local-seo"),
  "schema.business.images.too_many": () =>
    __("Choose up to 10 images.", "foundhint-local-seo"),
  "schema.business.visit_mode.invalid": () =>
    __("Choose where customers visit you.", "foundhint-local-seo"),
  "schema.business.extra.invalid": () =>
    __("That value is not one this field accepts.", "foundhint-local-seo"),
  "schema.location.email.invalid": () =>
    __(
      "Enter an email address, such as branch@example.com.",
      "foundhint-local-seo",
    ),
  "schema.location.branch_code.too_long": () =>
    __("A branch code can be 60 characters at most.", "foundhint-local-seo"),
  "schema.location.parent.invalid": () =>
    __("Choose your business, or not part of a group.", "foundhint-local-seo"),
  "schema.location.status.invalid": () =>
    __("Switch the branch on or off.", "foundhint-local-seo"),
  "schema.service.name.required": () =>
    __("Give the service a name.", "foundhint-local-seo"),
  "schema.service.name.too_long": () =>
    __("A service name can be 255 characters at most.", "foundhint-local-seo"),
  "schema.service.description.too_long": () =>
    __(
      "Keep the short description to 300 characters or fewer.",
      "foundhint-local-seo",
    ),
  "schema.service.service_type.too_long": () =>
    __("A category can be 100 characters at most.", "foundhint-local-seo"),
  "schema.service.status.invalid": () =>
    __("Switch the service on or off.", "foundhint-local-seo"),
  "schema.service.image.invalid": () =>
    __(
      "Enter the image's full web address, starting with https://.",
      "foundhint-local-seo",
    ),
  "schema.service.provider.invalid": () =>
    __("Choose who provides this service.", "foundhint-local-seo"),
  "schema.service.provider.branch_required": () =>
    __("Choose at least one branch.", "foundhint-local-seo"),
  "schema.service.person.too_long": () =>
    __(
      "A provider's name can be 200 characters at most.",
      "foundhint-local-seo",
    ),
  "schema.service.person.invalid": () =>
    __("Choose a person or a partner company.", "foundhint-local-seo"),
  "schema.service.areas.too_many": () =>
    __("A service can list 20 places at most.", "foundhint-local-seo"),
  "schema.service.areas.too_long": () =>
    __("A place name can be 191 characters at most.", "foundhint-local-seo"),
  "schema.service.areas.invalid": () =>
    __("Choose what kind of place it is.", "foundhint-local-seo"),
  "schema.service.page.invalid": () =>
    __(
      "Enter the page's full web address, starting with https://.",
      "foundhint-local-seo",
    ),
  "schema.service.page.not_found": () =>
    __("That page no longer exists. Choose another.", "foundhint-local-seo"),
  "schema.service.pricing.invalid": () =>
    __("Choose how the price is shown.", "foundhint-local-seo"),
  "schema.service.price.required": () =>
    __("Enter a price, or choose No price.", "foundhint-local-seo"),
  "schema.service.price.invalid": () =>
    __("Enter a price as a number, such as 1500.", "foundhint-local-seo"),
  "schema.service.price_max.required": () =>
    __("Enter the top of the range.", "foundhint-local-seo"),
  "schema.service.price_max.below_min": () =>
    __("The top of the range must be above its start.", "foundhint-local-seo"),
  "schema.service.currency.invalid": () =>
    __("Choose a currency.", "foundhint-local-seo"),
  "schema.placement.invalid": () =>
    __("Choose where the schema is added.", "foundhint-local-seo"),
  // Posts.
  "post.type.invalid": () =>
    __("Choose update, event or offer.", "foundhint-local-seo"),
  "post.type.locked": () =>
    __(
      "Google does not let a published post change type. Delete it and write a new one.",
      "foundhint-local-seo",
    ),
  "post.source.invalid": () =>
    __("That way of writing a post is not available.", "foundhint-local-seo"),
  "post.summary.required": () =>
    __("Write what the post says.", "foundhint-local-seo"),
  "post.summary.too_long": () =>
    __("Google allows 1,500 characters in a post.", "foundhint-local-seo"),
  "post.title.required": () => __("Give it a title.", "foundhint-local-seo"),
  "post.title.too_long": () =>
    __("Google allows 58 characters in a title.", "foundhint-local-seo"),
  "post.starts_at.required": () =>
    __("Choose when it starts.", "foundhint-local-seo"),
  "post.starts_at.invalid": () =>
    __("That start date is not a real date.", "foundhint-local-seo"),
  "post.ends_at.required": () =>
    __("Choose when it ends.", "foundhint-local-seo"),
  "post.ends_at.invalid": () =>
    __("That end date is not a real date.", "foundhint-local-seo"),
  "post.ends_at.before_start": () =>
    __("It has to end after it starts.", "foundhint-local-seo"),
  "post.cta_type.invalid": () =>
    __("Choose a button from the list.", "foundhint-local-seo"),
  "post.cta_url.required": () =>
    __("Add the link the button opens.", "foundhint-local-seo"),
  "post.cta_url.invalid": () =>
    __(
      "Enter a full web address, starting with https://",
      "foundhint-local-seo",
    ),
  "post.redeem_url.invalid": () =>
    __(
      "Enter a full web address, starting with https://",
      "foundhint-local-seo",
    ),
  "post.coupon_code.too_long": () =>
    __("A coupon code can be 58 characters at most.", "foundhint-local-seo"),
  "post.terms.too_long": () =>
    __("Terms can be 5,000 characters at most.", "foundhint-local-seo"),
  "post.media_url.processing": () =>
    __(
      "Google is still processing this photo. Wait a minute, then choose it again from Your gallery.",
      "foundhint-local-seo",
    ),
  "post.media_url.invalid": () =>
    __(
      "That photo is not a web address Google can open.",
      "foundhint-local-seo",
    ),
  "review.reply.required": () =>
    __("Write a reply before posting it.", "foundhint-local-seo"),
  "review.reply.too_long": () =>
    __(
      "That reply is too long for Google. Shorten it and try again.",
      "foundhint-local-seo",
    ),
  "special_hours.date.invalid": () =>
    __("Choose a real date for this day.", "foundhint-local-seo"),
  "special_hours.date.duplicate": () =>
    __(
      "That date is already in the list. Edit the existing entry instead.",
      "foundhint-local-seo",
    ),
  "media.type.unsupported": () =>
    __("Google accepts JPG and PNG photos only.", "foundhint-local-seo"),
  "media.size.too_large": () =>
    __("That photo is over 5 MB. Choose a smaller one.", "foundhint-local-seo"),
  "media.size.too_small": () =>
    __(
      "That file is too small to be a photo Google will accept.",
      "foundhint-local-seo",
    ),
  "media.dimensions.too_small": () =>
    __(
      "That photo is too small. Google needs at least 250 pixels on each side.",
      "foundhint-local-seo",
    ),
  "attributes.value.invalid": () =>
    __("That is not a value Google accepts here.", "foundhint-local-seo"),
  "service.not_found": () =>
    __(
      "That service no longer exists. Reload the page and try again.",
      "foundhint-local-seo",
    ),
  "service.duplicate": () =>
    __("That service is in the list twice.", "foundhint-local-seo"),
  "service.invalid": () =>
    __("That service could not be read.", "foundhint-local-seo"),
  "services.items.invalid": () =>
    __("The list of services could not be read.", "foundhint-local-seo"),
  "google.profile_description_contains_url": () =>
    __(
      "Google does not allow a web link in the description.",
      "foundhint-local-seo",
    ),
  "google.string_too_long": () =>
    __("Google says this is too long.", "foundhint-local-seo"),
  "google.invalid_category": () =>
    __("Google does not recognise that category.", "foundhint-local-seo"),
  "google.invalid_url": () =>
    __(
      "Google could not accept that web address. Check it opens in a browser.",
      "foundhint-local-seo",
    ),
  "google.invalid_value": () =>
    __("Google did not accept this value.", "foundhint-local-seo"),
  "business.category_id.unknown": () =>
    __(
      "Google does not have that category. Choose one from the list.",
      "foundhint-local-seo",
    ),
  "business.categories.unknown": () =>
    __(
      "One of those categories is not on Google's list. Choose each one from the suggestions.",
      "foundhint-local-seo",
    ),
  "business.categories.too_many": () =>
    __(
      "Google allows 9 extra categories at most. Remove one to add another.",
      "foundhint-local-seo",
    ),
  "business.categories.includes_primary": () =>
    __(
      "Your main category is already counted. Remove it from the extra categories.",
      "foundhint-local-seo",
    ),
  "business.email.invalid": () =>
    __("That does not look like an email address.", "foundhint-local-seo"),
  "business.phone.invalid": () =>
    __("That does not look like a phone number.", "foundhint-local-seo"),
  "business.website.invalid": () =>
    __(
      "Enter a full web address, starting with https://",
      "foundhint-local-seo",
    ),
  "business.logo_url.invalid": () =>
    __(
      "Enter a full image address, starting with https://",
      "foundhint-local-seo",
    ),
  "business.price_range.too_long": () =>
    __("Keep the price range short, like $$.", "foundhint-local-seo"),
  "business.founding_date.invalid": () =>
    __("Enter a real date in YYYY-MM-DD form.", "foundhint-local-seo"),
  "social.url.invalid": () =>
    __(
      "Enter the full profile address, starting with https://",
      "foundhint-local-seo",
    ),

  // Location.
  "location.name.required": () =>
    __("Give this location a name, such as Downtown.", "foundhint-local-seo"),
  "location.name.too_long": () =>
    __(
      "That name is too long — 255 characters at most.",
      "foundhint-local-seo",
    ),
  "address.too_long": () =>
    __("That is too long — 255 characters at most.", "foundhint-local-seo"),
  "address.country.invalid": () =>
    __(
      "Use a two-letter country code, such as US or BD.",
      "foundhint-local-seo",
    ),
  "location.latitude.invalid": () =>
    __("Latitude must be between -90 and 90.", "foundhint-local-seo"),
  "location.longitude.invalid": () =>
    __("Longitude must be between -180 and 180.", "foundhint-local-seo"),
  "location.email.invalid": () =>
    __("That does not look like an email address.", "foundhint-local-seo"),
  "location.phone.invalid": () =>
    __("That does not look like a phone number.", "foundhint-local-seo"),
  "location.website.invalid": () =>
    __(
      "Enter a full web address, starting with https://",
      "foundhint-local-seo",
    ),
  "location.timezone.invalid": () =>
    __("Choose a time zone from the list.", "foundhint-local-seo"),
  "location.status.invalid": () =>
    __("Choose a status from the list.", "foundhint-local-seo"),

  // Opening hours.
  "hours.day.invalid": () =>
    __("That is not a valid day.", "foundhint-local-seo"),
  "hours.open_time.required": () =>
    __("Add an opening time, or mark the day closed.", "foundhint-local-seo"),
  "hours.close_time.required": () =>
    __("Add a closing time, or mark the day closed.", "foundhint-local-seo"),
  "hours.range.zero_length": () =>
    __("Opening and closing time cannot be the same.", "foundhint-local-seo"),
  "hours.periods.overlap": () =>
    __("These times overlap each other.", "foundhint-local-seo"),

  // Service.
  "service.name.required": () =>
    __("Give this service a name.", "foundhint-local-seo"),
  "service.name.too_long": () =>
    __(
      "That name is too long — 255 characters at most.",
      "foundhint-local-seo",
    ),
  "service.slug.required": () =>
    __("A service needs a URL slug.", "foundhint-local-seo"),
  "service.slug.too_long": () =>
    __(
      "That slug is too long — 200 characters at most.",
      "foundhint-local-seo",
    ),
  "service.price.invalid": () => __("Enter a number.", "foundhint-local-seo"),
  "service.price.negative": () =>
    __("A price cannot be negative.", "foundhint-local-seo"),
  "service.currency.required_with_price": () =>
    __("Choose a currency for this price.", "foundhint-local-seo"),
  "service.currency.invalid": () =>
    __("Use a three-letter currency code, such as USD.", "foundhint-local-seo"),
  "service.url.invalid": () =>
    __(
      "Enter a full web address, starting with https://",
      "foundhint-local-seo",
    ),
  "service.image_url.invalid": () =>
    __(
      "Enter a full image address, starting with https://",
      "foundhint-local-seo",
    ),
  "service.status.invalid": () =>
    __("Choose a status from the list.", "foundhint-local-seo"),

  // Schema. Not validation errors: these describe why the markup is not
  // being published, or what would make it better.
  "schema.business.missing": () =>
    __(
      "Add your business details before publishing markup.",
      "foundhint-local-seo",
    ),
  "schema.location.missing": () =>
    __("Add a location before publishing markup.", "foundhint-local-seo"),
  "schema.name.missing": () =>
    __("A business name is required.", "foundhint-local-seo"),
  "schema.address.incomplete": () =>
    __(
      "The address needs a street, a city and a country at least.",
      "foundhint-local-seo",
    ),
  "schema.location.permanently_closed": () =>
    __(
      "This location is marked permanently closed, so nothing is published for it.",
      "foundhint-local-seo",
    ),
  "schema.phone.missing": () => __("No phone number.", "foundhint-local-seo"),
  "schema.website.missing": () =>
    __("No website address.", "foundhint-local-seo"),
  "schema.logo.missing": () => __("No logo.", "foundhint-local-seo"),
  "schema.description.missing": () =>
    __("No description.", "foundhint-local-seo"),
  "schema.geo.missing": () => __("No map coordinates.", "foundhint-local-seo"),
  "schema.hours.missing": () =>
    __("No opening hours set.", "foundhint-local-seo"),
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
  // A branch field shares the business field's wording.
  const entry =
    MESSAGES[code] ??
    (String(code).startsWith("schema.location.")
      ? MESSAGES[String(code).replace("schema.location.", "schema.business.")]
      : undefined);

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
        "foundhint-local-seo",
      ),
    fhint_forbidden: () =>
      __("You do not have permission to change this.", "foundhint-local-seo"),
    fhint_business_required: () =>
      __("Add your business details first.", "foundhint-local-seo"),
    fhint_location_not_found: () =>
      __("That location no longer exists.", "foundhint-local-seo"),
    fhintpremium_google_required: () =>
      __(
        "Connect your Google Business Profile to set up schema.",
        "foundhint-local-seo",
      ),
    fhint_post_not_found: () =>
      __(
        "That post no longer exists. Sync posts to see the latest.",
        "foundhint-local-seo",
      ),
    fhint_post_live: () =>
      __(
        "This post is on Google. Changes to it are published straight away.",
        "foundhint-local-seo",
      ),
    fhint_post_already_live: () =>
      __("This post is already on Google.", "foundhint-local-seo"),
    fhint_review_not_found: () =>
      __(
        "That review is no longer stored here. Read your reviews from Google again.",
        "foundhint-local-seo",
      ),
    fhint_service_not_found: () =>
      __("That service no longer exists.", "foundhint-local-seo"),
    fhint_save_failed: () =>
      __("The changes could not be saved. Try again.", "foundhint-local-seo"),
    fhint_nothing_to_reorder: () =>
      __("Nothing to reorder.", "foundhint-local-seo"),
    fhint_validation_failed: () =>
      __("Check the highlighted fields and try again.", "foundhint-local-seo"),
    fhint_address_locked: () =>
      __(
        "This address comes from your Google Business Profile. Change it on Google and it will be picked up here.",
        "foundhint-local-seo",
      ),
    fhint_google_not_connected: () =>
      __("Connect Google before sending your profile.", "foundhint-local-seo"),
    fhint_google_not_mapped: () =>
      __(
        "Choose which Google listing belongs to this business first.",
        "foundhint-local-seo",
      ),
    fhint_publish_stale: () =>
      __(
        "Something changed since this was checked. Check again before sending.",
        "foundhint-local-seo",
      ),
    fhint_publish_nothing_to_send: () =>
      __("Google already has everything in this step.", "foundhint-local-seo"),
    fhint_google_rejected: () =>
      __(
        "Google did not accept this. Nothing was changed.",
        "foundhint-local-seo",
      ),
  };

  if (known[code]) {
    return known[code]();
  }

  if (code === "fhint_location_limit_reached") {
    return sprintf(
      /* translators: %d: number of locations included in the plan. */
      __("Your plan includes %d location.", "foundhint-local-seo"),
      error?.data?.data?.limit ?? 1,
    );
  }

  if (code === "fhint_service_limit_reached") {
    return sprintf(
      /* translators: %d: number of services included in the plan. */
      __("Your plan includes %d services.", "foundhint-local-seo"),
      error?.data?.data?.limit ?? 5,
    );
  }

  return (
    error?.data?.message ||
    __("Something went wrong. Try again.", "foundhint-local-seo")
  );
}
