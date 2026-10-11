/**
 * The profile as the screen edits it, and back again.
 *
 * The API answers in the shape each entity stores; a form wants something
 * flatter to bind inputs to. Every section has a pair here: `*Model()` turns
 * what the server sent into what the screen edits, and `*Fields()` turns an
 * edited model into the `fields` of a save. Keeping both in one file is what
 * keeps them inverse to each other.
 *
 * A section is "changed" when its model no longer equals the one made from
 * the server's copy — compared as JSON, which is exact for these plain
 * objects and needs no per-field bookkeeping.
 */

export const SECTIONS = [
  "info",
  "address",
  "hours",
  "social",
  "attributes",
  "services",
  "media",
];

// Sections with something to save. Photos arrive by upload, not by a save.
export const EDITABLE = [
  "info",
  "address",
  "hours",
  "social",
  "attributes",
  "services",
];

export const DESCRIPTION_MAX = 750;
export const SERVICE_DESCRIPTION_MAX = 250;

export function same(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ── info ────────────────────────────────────────────────────────────────

export function infoModel(info = {}) {
  return {
    name: info.name ?? "",
    primary_category_id: info.primary_category_id ?? "",
    primary_category: info.primary_category ?? "",
    secondary_categories: (info.secondary_categories ?? [])
      .filter((item) => item && typeof item === "object")
      .map((item) => ({ id: item.id ?? "", name: item.name ?? "" })),
    description: info.description ?? "",
    website: info.website ?? "",
    phone: info.phone ?? "",
  };
}

export function infoFields(model, base) {
  const fields = {};

  for (const key of ["name", "description", "website", "phone"]) {
    if (model[key] !== base[key]) {
      fields[key] = model[key];
    }
  }

  if (
    model.primary_category_id !== base.primary_category_id ||
    model.primary_category !== base.primary_category
  ) {
    // An id when one was chosen from Google's list; otherwise the bare name,
    // which the server ties back to an id when it can.
    if (model.primary_category_id) {
      fields.primary_category_id = model.primary_category_id;
    } else {
      fields.primary_category = model.primary_category;
    }
  }

  if (!same(model.secondary_categories, base.secondary_categories)) {
    fields.secondary_categories = model.secondary_categories.map(
      (item) => item.id,
    );
  }

  return fields;
}

/**
 * Whether text contains a web address, as the server and Google judge it.
 * Mirrors `Business::has_link()`; the server's answer is still the one that
 * counts, this only lets the warning appear while typing.
 */
export function hasLink(text) {
  const value = String(text ?? "");

  if (/(?:https?:\/\/|\bwww\.)\S/i.test(value)) {
    return true;
  }

  return /\b[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.(?:com|net|org|info|biz|io|app|dev|shop|store|online|site|xyz)\b/i.test(
    value,
  );
}

// ── address ─────────────────────────────────────────────────────────────

const ADDRESS_FIELDS = [
  "address_line_1",
  "address_line_2",
  "city",
  "region",
  "postal_code",
  "country",
];

export function addressModel(address = {}) {
  const model = {};

  for (const key of ADDRESS_FIELDS) {
    model[key] = address[key] ?? "";
  }

  return model;
}

export function addressFields(model, base) {
  const fields = {};

  for (const key of ADDRESS_FIELDS) {
    if (model[key] !== base[key]) {
      fields[key] = model[key];
    }
  }

  return fields;
}

// ── hours ───────────────────────────────────────────────────────────────

const DEFAULT_PERIOD = { from: "09:00", to: "17:00" };

/**
 * A weekday is one of four things: not told, closed, open all day, or open
 * for one or more periods. "Not told" is kept apart from "closed" all the
 * way to the server — a day nobody has touched is not sent, so it is never
 * published as shut.
 */
export function hoursModel(hours = {}) {
  const days = hours.opening_hours?.days ?? [];

  const week = days.map((day) => {
    const periods = day.periods ?? [];
    const closed = periods.some((period) => period.is_closed);
    const all = periods.some((period) => period.is_24h);

    return {
      day: day.day_of_week,
      name: day.day_name,
      configured: Boolean(day.configured),
      open: Boolean(day.configured) && !closed,
      all,
      periods:
        day.configured && !closed && !all
          ? periods.map((period) => ({
              from: period.open_time,
              to: period.close_time,
            }))
          : [{ ...DEFAULT_PERIOD }],
    };
  });

  const special = (hours.special_hours ?? []).map((day) => ({
    date: day.date,
    open: !day.is_closed,
    all: Boolean(day.is_24h),
    note: day.note ?? "",
    periods:
      !day.is_closed && !day.is_24h && day.periods?.length
        ? day.periods.map((period) => ({
            from: period.open_time,
            to: period.close_time,
          }))
        : [{ ...DEFAULT_PERIOD }],
  }));

  return { week, special };
}

export function hoursFields(model, base) {
  const fields = {};

  if (!same(model.week, base.week)) {
    const week = {};

    for (const day of model.week) {
      if (!day.configured) {
        continue;
      }

      if (!day.open) {
        week[day.day] = { is_closed: true };
      } else if (day.all) {
        week[day.day] = { is_24h: true };
      } else {
        week[day.day] = {
          periods: day.periods.map((period) => ({
            open_time: period.from,
            close_time: period.to,
          })),
        };
      }
    }

    fields.opening_hours = week;
  }

  if (!same(model.special, base.special)) {
    fields.special_hours = model.special.map((day) => {
      if (!day.open) {
        return { date: day.date, is_closed: true, note: day.note };
      }

      if (day.all) {
        return { date: day.date, is_24h: true, note: day.note };
      }

      return {
        date: day.date,
        note: day.note,
        periods: day.periods.map((period) => ({
          open_time: period.from,
          close_time: period.to,
        })),
      };
    });
  }

  return fields;
}

export function newPeriod() {
  return { ...DEFAULT_PERIOD };
}

// ── social ──────────────────────────────────────────────────────────────

export function socialModel(social = {}) {
  const model = {};

  for (const network of social.networks ?? []) {
    model[network] = social.social_profiles?.[network] ?? "";
  }

  return model;
}

export function socialFields(model) {
  return { social_profiles: { ...model } };
}

/**
 * A link's state for its badge: nothing entered, a usable address, or
 * something that is not one. Only the server decides what is saved; this is
 * the same question asked early enough to answer while typing.
 */
export function linkState(value) {
  const url = String(value ?? "").trim();

  if (!url) {
    return "empty";
  }

  return /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(url) ? "ok" : "bad";
}

// ── attributes ──────────────────────────────────────────────────────────

export function attributesModel(attributes = {}) {
  const model = {};

  for (const answer of attributes.values ?? []) {
    // Links are attributes too, on Google's side; the Social section owns
    // those, and sending them from here as well would save them twice.
    if (answer.value_type === "url") {
      continue;
    }

    model[answer.attribute_id] = answer.value;
  }

  return model;
}

/**
 * How many attributes carry a "yes": a ticked box, a chosen option, or at
 * least one of several. A "no" is an answer but not a selection.
 */
export function selectedAttributes(model = {}) {
  return Object.values(model).filter((value) =>
    Array.isArray(value)
      ? value.length > 0
      : value === true || (typeof value === "string" && value !== ""),
  ).length;
}

export function attributesFields(model, base) {
  const values = {};

  for (const id of new Set([...Object.keys(model), ...Object.keys(base)])) {
    if (!same(model[id], base[id])) {
      // Gone from the model means the answer was withdrawn, which the API
      // spells as null — not the same as answering "no".
      values[id] = id in model ? model[id] : null;
    }
  }

  return { values };
}

// ── services ────────────────────────────────────────────────────────────

export function servicesModel(services = {}) {
  return (services.items ?? []).map((item) => ({
    id: item.id,
    name: item.name ?? "",
    description: item.description ?? "",
    price:
      item.price === null || item.price === undefined ? "" : String(item.price),
    currency: item.currency ?? "",
    status: item.status ?? "active",
    google_item_type: item.google_item_type ?? "",
    google_service_type_id: item.google_service_type_id ?? "",
  }));
}

export function servicesFields(model) {
  return {
    items: model.map((item) => {
      const entry = {
        name: item.name,
        description: item.description,
        price: item.price === "" ? "" : Number(item.price),
        currency: item.currency,
        status: item.status,
        // Which kind of service it is on Google: one of Google's own
        // ("structured", with its id) or words of the owner's choosing.
        google_item_type: item.google_item_type,
        google_service_type_id: item.google_service_type_id,
      };

      // Sent back only for a service that already exists: a new one has no
      // id, and that absence is how the server knows to create it.
      if (item.id) {
        entry.id = item.id;
      }

      return entry;
    }),
  };
}

// ── the whole screen ────────────────────────────────────────────────────

const MODELS = {
  info: infoModel,
  address: addressModel,
  hours: hoursModel,
  social: socialModel,
  attributes: attributesModel,
  services: servicesModel,
};

const FIELDS = {
  info: infoFields,
  address: addressFields,
  hours: hoursFields,
  social: socialFields,
  attributes: attributesFields,
  services: servicesFields,
};

export function modelFor(section, data) {
  return MODELS[section](data);
}

export function fieldsFor(section, model, base) {
  return FIELDS[section](model, base);
}

export function modelsFor(sections = {}) {
  const models = {};

  for (const section of EDITABLE) {
    models[section] = modelFor(section, sections[section]);
  }

  return models;
}
