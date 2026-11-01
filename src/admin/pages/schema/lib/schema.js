import { __ } from "@wordpress/i18n";

/** Field labels, in the design's words. */
export function fieldLabel(key, scope = "business") {
  if (scope === "location") {
    const branch = {
      name: __("Branch name", "foundhint-local-seo"),
      branch_code: __("Branch code", "foundhint-local-seo"),
      telephone: __("Phone", "foundhint-local-seo"),
      email: __("Email", "foundhint-local-seo"),
      url: __("Branch page URL", "foundhint-local-seo"),
    }[key];

    if (branch) {
      return branch;
    }
  }

  return (
    {
      name: __("Business name", "foundhint-local-seo"),
      url: __("Business website", "foundhint-local-seo"),
      telephone: __("Phone number", "foundhint-local-seo"),
      logo: __("Business logo", "foundhint-local-seo"),
      images: __("Business images", "foundhint-local-seo"),
      price_range: __("Price range", "foundhint-local-seo"),
      description: __("Description", "foundhint-local-seo"),
      street_address: __("Street address", "foundhint-local-seo"),
      locality: __("City", "foundhint-local-seo"),
      region: __("State or region", "foundhint-local-seo"),
      postal_code: __("Postal code", "foundhint-local-seo"),
      country: __("Country", "foundhint-local-seo"),
      latitude: __("Latitude", "foundhint-local-seo"),
      longitude: __("Longitude", "foundhint-local-seo"),
      map_url: __("Map URL", "foundhint-local-seo"),
      hours: __("Opening hours", "foundhint-local-seo"),
      areas_served: __("Areas served", "foundhint-local-seo"),
      social: __("Social profiles", "foundhint-local-seo"),
      legal_name: __("Legal name", "foundhint-local-seo"),
      alternate_name: __("Alternate name", "foundhint-local-seo"),
      email: __("Email", "foundhint-local-seo"),
      founding_date: __("Founding date", "foundhint-local-seo"),
      founder: __("Founder", "foundhint-local-seo"),
      knows_about: __("Topics you are known for", "foundhint-local-seo"),
      contact_type: __("Contact type", "foundhint-local-seo"),
      contact_telephone: __("Contact phone", "foundhint-local-seo"),
      contact_email: __("Contact email", "foundhint-local-seo"),
      contact_languages: __("Languages spoken", "foundhint-local-seo"),
    }[key] ?? key
  );
}

export function badgeLabel(badge, visitMode) {
  if (badge === "storefront") {
    return visitMode === "service_area"
      ? __("Optional", "foundhint-local-seo")
      : __("Required by Google for a storefront", "foundhint-local-seo");
  }

  return {
    required: __("Required by Google", "foundhint-local-seo"),
    recommended: __("Recommended", "foundhint-local-seo"),
    optional: __("Optional", "foundhint-local-seo"),
  }[badge];
}

export function placementLabel(placement) {
  return {
    every_page: __("every page", "foundhint-local-seo"),
    home_only: __("home page only", "foundhint-local-seo"),
    chosen: __("pages you choose", "foundhint-local-seo"),
  }[placement];
}

/**
 * "2 hours ago" from a UTC 'Y-m-d H:i:s'.
 *
 * @param {string} utc Stored time.
 * @return {string}
 */
export function relative(utc) {
  if (!utc) {
    return "";
  }

  const then = Date.parse(`${utc.replace(" ", "T")}Z`);
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));

  if (Number.isNaN(then)) {
    return "";
  }

  const format = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  if (minutes < 60) {
    return format.format(-minutes, "minute");
  }

  if (minutes < 60 * 24) {
    return format.format(-Math.round(minutes / 60), "hour");
  }

  return format.format(-Math.round(minutes / 1440), "day");
}

/** Whether Google could fetch this site (Rich Results Test needs it to). */
export function isPublicSite() {
  const host = window.location.hostname;

  return !(
    host === "localhost" ||
    /\.(test|local|localhost|internal)$/.test(host) ||
    /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) ||
    !host.includes(".")
  );
}

/** Count leaf properties, not counting @context (matches the server). */
export function countProperties(value) {
  if (value === null || typeof value !== "object") {
    return 1;
  }

  return Object.entries(value).reduce(
    (sum, [key, item]) =>
      key === "@context" ? sum : sum + countProperties(item),
    0,
  );
}

/**
 * The Business fields as the screen lays them out — the same list Pro's
 * BusinessFields::definitions() serves. Used only to draw the locked view
 * from the free markup when Pro is not active.
 */
export const BUSINESS_FIELDS = [
  ["name", "info", "name", "gbp.title", "required", "text"],
  ["url", "info", "url", "gbp.websiteUri", "recommended", "url"],
  [
    "telephone",
    "info",
    "telephone",
    "gbp.phoneNumbers.primaryPhone",
    "recommended",
    "tel",
  ],
  ["logo", "info", "logo", "", "recommended", "url"],
  ["images", "info", "image", "gbp.media[]", "optional", "images"],
  ["price_range", "info", "priceRange", "", "optional", "price"],
  [
    "description",
    "info",
    "description",
    "gbp.profile.description",
    "optional",
    "textarea",
  ],
  [
    "street_address",
    "address",
    "address.streetAddress",
    "gbp.storefrontAddress.addressLines",
    "storefront",
    "text",
  ],
  [
    "locality",
    "address",
    "address.addressLocality",
    "gbp.storefrontAddress.locality",
    "storefront",
    "text",
  ],
  [
    "region",
    "address",
    "address.addressRegion",
    "gbp.storefrontAddress.administrativeArea",
    "storefront",
    "text",
  ],
  [
    "postal_code",
    "address",
    "address.postalCode",
    "gbp.storefrontAddress.postalCode",
    "storefront",
    "text",
  ],
  [
    "country",
    "address",
    "address.addressCountry",
    "gbp.storefrontAddress.regionCode",
    "storefront",
    "text",
  ],
  [
    "latitude",
    "address",
    "geo.latitude",
    "gbp.latlng.latitude",
    "optional",
    "number",
  ],
  [
    "longitude",
    "address",
    "geo.longitude",
    "gbp.latlng.longitude",
    "optional",
    "number",
  ],
  ["map_url", "address", "hasMap", "gbp.metadata.mapsUri", "optional", "url"],
  [
    "hours",
    "reach",
    "openingHoursSpecification",
    "gbp.regularHours",
    "recommended",
    "hours",
  ],
  [
    "areas_served",
    "reach",
    "areaServed",
    "gbp.serviceArea.places",
    "optional",
    "text",
  ],
  ["social", "reach", "sameAs", "", "optional", "lines"],
].map(([key, group, property, gbp, badge, inputKind]) => ({
  key,
  group,
  property,
  gbp,
  badge,
  input: inputKind,
}));

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

/**
 * OpeningHoursSpecification nodes as the hours payload the grid draws.
 */
export function hoursFromSpecs(specs) {
  const byDay = Object.fromEntries(DAYS.map((day) => [day, []]));

  (Array.isArray(specs) ? specs : [])
    .filter((spec) => !spec.validFrom)
    .forEach((spec) => {
      const days = []
        .concat(spec.dayOfWeek ?? [])
        .map((day) => String(day).replace("https://schema.org/", ""));

      days.forEach((day) => {
        if (!byDay[day]) {
          return;
        }

        byDay[day].push({
          open_time: spec.opens,
          close_time: spec.closes,
          is_closed: spec.opens === "00:00" && spec.closes === "00:00",
          is_24h: spec.opens === "00:00" && spec.closes === "23:59",
        });
      });
    });

  return {
    days: DAYS.map((day) => ({
      day_name: day,
      configured: byDay[day].length > 0,
      periods: byDay[day],
    })),
  };
}

/**
 * What the free plugin publishes, drawn as the Business tab's state: the
 * locked view free users see. Every value is real — it is the markup
 * already on their site.
 */
export function lockedBusinessState(schema) {
  const node = schema?.graph?.["@graph"]?.[0] ?? {};
  const address = node.address ?? {};
  const values = {
    name: node.name ?? "",
    url: node.url ?? "",
    telephone: node.telephone ?? "",
    logo: node.logo ?? "",
    images: [].concat(node.image ?? []).filter((url) => url !== node.logo),
    price_range: node.priceRange ?? "",
    description: node.description ?? "",
    street_address: address.streetAddress ?? "",
    locality: address.addressLocality ?? "",
    region: address.addressRegion ?? "",
    postal_code: address.postalCode ?? "",
    country: address.addressCountry ?? "",
    latitude: node.geo?.latitude ?? "",
    longitude: node.geo?.longitude ?? "",
    map_url: node.hasMap ?? "",
    hours: hoursFromSpecs(node.openingHoursSpecification),
    areas_served: []
      .concat(node.areaServed ?? [])
      .map((place) => place?.name ?? place)
      .join(", "),
    social: [].concat(node.sameAs ?? []).join("\n"),
  };

  return {
    schema_kind: "localbusiness",
    type: node["@type"] ?? "LocalBusiness",
    type_label: node["@type"] ?? "LocalBusiness",
    matched_from: "",
    extras: {},
    extra_fields: [],
    fields: BUSINESS_FIELDS.map((field) => ({
      ...field,
      value: values[field.key],
      google_value: null,
      source: "manual",
      disagrees: false,
    })),
    eligible: { ok: Boolean(schema?.isPublishable), missing: [] },
    missing: [],
    status: schema?.isPublishable ? "active" : "draft",
    placement: "every_page",
    post_ids: [],
    photos: [],
    google: false,
    preview: node["@type"]
      ? { "@context": "https://schema.org", ...node }
      : null,
  };
}

/** The Location fields as the screen lays them out (Premium's LocationFields). */
export const LOCATION_FIELDS = [
  ["name", "branch", "name", "gbp.title", "required", "text"],
  ["branch_code", "branch", "branchCode", "gbp.storeCode", "optional", "text"],
  [
    "street_address",
    "address",
    "address.streetAddress",
    "gbp.storefrontAddress.addressLines",
    "storefront",
    "text",
  ],
  [
    "locality",
    "address",
    "address.addressLocality",
    "gbp.storefrontAddress.locality",
    "storefront",
    "text",
  ],
  [
    "region",
    "address",
    "address.addressRegion",
    "gbp.storefrontAddress.administrativeArea",
    "optional",
    "text",
  ],
  [
    "postal_code",
    "address",
    "address.postalCode",
    "gbp.storefrontAddress.postalCode",
    "optional",
    "text",
  ],
  [
    "country",
    "address",
    "address.addressCountry",
    "gbp.storefrontAddress.regionCode",
    "storefront",
    "text",
  ],
  [
    "latitude",
    "address",
    "geo.latitude",
    "gbp.latlng.latitude",
    "optional",
    "number",
  ],
  [
    "longitude",
    "address",
    "geo.longitude",
    "gbp.latlng.longitude",
    "optional",
    "number",
  ],
  ["map_url", "address", "hasMap", "gbp.metadata.mapsUri", "optional", "url"],
  [
    "telephone",
    "contact",
    "telephone",
    "gbp.phoneNumbers.primaryPhone",
    "recommended",
    "tel",
  ],
  ["email", "contact", "email", "", "optional", "email"],
  ["url", "contact", "url", "gbp.websiteUri", "recommended", "url"],
  [
    "hours",
    "hours",
    "openingHoursSpecification",
    "gbp.regularHours",
    "recommended",
    "hours",
  ],
].map(([key, group, property, gbp, badge, inputKind]) => ({
  key,
  group,
  property,
  gbp,
  badge,
  input: inputKind,
}));

/**
 * One branch as the free plugin prints it, drawn as the Location tab's
 * locked state.
 */
export function lockedLocationState(schema) {
  const node = schema?.graph?.["@graph"]?.[0] ?? {};
  const address = node.address ?? {};
  const values = {
    name: node.name ?? "",
    branch_code: "",
    street_address: address.streetAddress ?? "",
    locality: address.addressLocality ?? "",
    region: address.addressRegion ?? "",
    postal_code: address.postalCode ?? "",
    country: address.addressCountry ?? "",
    latitude: node.geo?.latitude ?? "",
    longitude: node.geo?.longitude ?? "",
    map_url: node.hasMap ?? "",
    telephone: node.telephone ?? "",
    email: node.email ?? "",
    url: node.url ?? "",
    hours: hoursFromSpecs(node.openingHoursSpecification),
  };

  return {
    fields: LOCATION_FIELDS.map((field) => ({
      ...field,
      value: values[field.key],
      google_value: null,
      source: "manual",
      disagrees: false,
    })),
    parent: node.parentOrganization ? "business" : "none",
    parent_name: "",
    sisters: [],
    missing: [],
    status: schema?.isPublishable ? "active" : "draft",
    placement: "every_page",
    post_ids: [],
    warnings: [],
    preview: node["@type"]
      ? { "@context": "https://schema.org", ...node }
      : null,
  };
}

/**
 * The Service tab without Premium: the services the free markup already
 * prints (inside the business's OfferCatalog), shown read-only.
 *
 * @param {Object} schema The free plugin's /schema response.
 * @return {Object[]} Each `{ id, name, status, from_google, meta, warnings, node }`.
 */
export function lockedServices(schema) {
  const graph = schema?.graph?.["@graph"] ?? [];
  const catalog = graph.find((node) => node["@type"] === "OfferCatalog");
  const offers = catalog?.itemListElement ?? [];

  return offers.map((offer, index) => {
    const service = offer.itemOffered ?? {};

    return {
      id: index + 1,
      name: service.name ?? "",
      status: "active",
      from_google: false,
      meta: {
        category: "",
        provider: catalog?.name ?? "",
        areas: 0,
        page: service.url ?? "",
      },
      warnings: [],
      node: {
        "@context": "https://schema.org",
        ...service,
        ...(offer.price
          ? {
              offers: {
                "@type": "Offer",
                price: offer.price,
                priceCurrency: offer.priceCurrency,
              },
            }
          : {}),
      },
    };
  });
}
