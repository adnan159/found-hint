import { __ } from "@wordpress/i18n";

// Google's limit on a reply, which it counts in bytes of UTF-8, not letters.
export const MAX_BYTES = 4096;

const encoder = new TextEncoder();

export function bytes(text) {
  return encoder.encode(String(text ?? "")).length;
}

/**
 * The words a template may use, swapped for this review's details.
 * The same list the template editor offers to insert.
 */
export const PLACEHOLDERS = [
  "{{reviewer_name}}",
  "{{location_name}}",
  "{{location_city}}",
  "{{business_keyword}}",
  "{{rating}}",
  "{{review_text}}",
];

/**
 * Ready-made replies for each star rating: one for a review with words,
 * one for a rating left without any. Plain and short on purpose — a
 * starting point to make personal, not a reply to send unread.
 *
 * @return {Object<number, {comment: string, stars: string}>}
 */
export function builtInReplies() {
  return {
    5: {
      comment: __(
        "Thank you so much, {{reviewer_name}}! We're really glad you had a great experience with us. We look forward to seeing you again. — {{location_name}}",
        "foundhint-local-seo",
      ),
      stars: __(
        "Thank you for the 5 stars, {{reviewer_name}}! It means a lot to our team at {{location_name}}.",
        "foundhint-local-seo",
      ),
    },
    4: {
      comment: __(
        "Thank you, {{reviewer_name}}! We're glad you enjoyed your visit, and we'll keep working to make the next one even better. — {{location_name}}",
        "foundhint-local-seo",
      ),
      stars: __(
        "Thanks for the 4 stars, {{reviewer_name}}! We hope to see you again soon at {{location_name}}.",
        "foundhint-local-seo",
      ),
    },
    3: {
      comment: __(
        "Thank you for your feedback, {{reviewer_name}}. We'd love to hear how we could have made your visit better — please get in touch with us at {{location_name}}.",
        "foundhint-local-seo",
      ),
      stars: __(
        "Thank you for your rating, {{reviewer_name}}. If there's anything we could do better, we'd love to hear it.",
        "foundhint-local-seo",
      ),
    },
    2: {
      comment: __(
        "{{reviewer_name}}, we're sorry your visit fell short. We'd like to put it right — please contact us at {{location_name}} so we can talk it through.",
        "foundhint-local-seo",
      ),
      stars: __(
        "We're sorry your experience wasn't better, {{reviewer_name}}. Please get in touch so we can make it right.",
        "foundhint-local-seo",
      ),
    },
    1: {
      comment: __(
        "{{reviewer_name}}, we're truly sorry to read this. This isn't the experience we want for anyone. Please contact us at {{location_name}} so we can make it right.",
        "foundhint-local-seo",
      ),
      stars: __(
        "We're sorry, {{reviewer_name}}. We'd like to understand what went wrong — please get in touch with us at {{location_name}}.",
        "foundhint-local-seo",
      ),
    },
  };
}

/**
 * The built-in reply for a review, with its details filled in.
 *
 * @param {Object} review  The review.
 * @param {Object} context `{ locationName, locationCity }`.
 * @return {string}
 */
export function builtInReply(review, context) {
  const rating = Math.min(5, Math.max(1, Number(review.star_rating) || 5));
  const kind = String(review.comment ?? "").trim() ? "comment" : "stars";

  return fillPlaceholders(builtInReplies()[rating][kind], review, context);
}

/**
 * What a review's placeholders become: from its own Google listing (the
 * Reviews state's `locations[].reply`, built by `ReplyContext` on the
 * server) — not the location in the bar, which may be "all".
 *
 * @param {Object[]} listings The Reviews state's locations.
 * @param {Object}   review   The review.
 * @return {{locationName: string, locationCity: string, keyword: string}}
 */
export function replyContextFor(listings, review) {
  const reply =
    (listings ?? []).find((item) => item.location_name === review.location_name)
      ?.reply ?? {};

  return {
    locationName: reply.location_name ?? "",
    locationCity: reply.location_city ?? "",
    keyword: reply.keyword ?? "",
  };
}

/**
 * Swap the placeholders in a reply for this review's details. One with no
 * value here — no city yet — is taken out, rather than left in curly
 * brackets on a public reply. `{{ Reviewer_Name }}` reads as
 * `{{reviewer_name}}`. When `{{review_text}}` would push the reply past
 * Google's limit, the review's words are shortened to fit.
 *
 * Premium's `ReplyText::fill()` does the same for auto-reply — change both
 * together.
 */
export function fillPlaceholders(text, review, context = {}) {
  const values = {
    reviewer_name: firstNameOf(review),
    location_name: context.locationName ?? "",
    location_city: context.locationCity ?? "",
    business_keyword: context.keyword ?? "",
    rating: String(review.star_rating ?? ""),
    review_text: String(review.comment ?? ""),
  };
  const filled = fillWith(text, values);
  const over = bytes(filled) - MAX_BYTES;

  if (over <= 0 || !values.review_text) {
    return filled;
  }

  return fillWith(text, {
    ...values,
    review_text:
      cutBytes(
        values.review_text,
        bytes(values.review_text) - over - bytes("…"),
      ) + "…",
  });
}

/** Placeholders that cannot be left out without breaking the sentence. */
const REQUIRED = [
  "location_name",
  "location_city",
  "business_keyword",
  "review_text",
];

/**
 * The placeholders a text uses whose value, for this review, is missing
 * and cannot just be left out ("in {{location_city}}" with no city reads
 * "in."). Premium's `ReplyText::missing()` decides the same for
 * auto-reply, which does not send such a reply.
 *
 * @return {string[]} Names, e.g. `location_city`.
 */
export function missingValues(text, review, context = {}) {
  const values = {
    location_name: context.locationName ?? "",
    location_city: context.locationCity ?? "",
    business_keyword: context.keyword ?? "",
    review_text: String(review.comment ?? "").trim(),
  };
  const used = [...String(text).matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map(
    ([, key]) => key.toLowerCase(),
  );

  return [
    ...new Set(used.filter((key) => REQUIRED.includes(key) && !values[key])),
  ];
}

function fillWith(text, values) {
  // An empty value leaves stray punctuation: "stars, !" or ", we're".
  const filled = String(text)
    .replace(
      /\{\{\s*(\w+)\s*\}\}/g,
      (_, key) => values[key.toLowerCase()] ?? "",
    )
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/,(\s*[.!?])/g, "$1")
    .replace(/^[\s,]+/, "")
    .replace(/ {2,}/g, " ")
    .trim();

  return filled.charAt(0).toUpperCase() + filled.slice(1);
}

/** The longest start of a text that fits in `max` bytes, whole letters only. */
function cutBytes(text, max) {
  let out = "";

  for (const letter of text) {
    if (bytes(out + letter) > max) {
      break;
    }
    out += letter;
  }

  return out.trimEnd();
}

/**
 * The name to greet a reviewer by: their first name, or nothing for an
 * anonymous one. "IMAM" reads as shouting and "imam" as careless: both
 * become "Imam".
 */
export function firstNameOf(review) {
  if (review.is_anonymous || !review.reviewer_name) {
    return "";
  }

  const first = String(review.reviewer_name).trim().split(/\s+/)[0];
  const tidy =
    first === first.toUpperCase() && first.length > 1
      ? first.charAt(0) + first.slice(1).toLowerCase()
      : first;

  return tidy.charAt(0).toUpperCase() + tidy.slice(1);
}

/**
 * Two letters for an avatar with no photo.
 */
export function initialsOf(review) {
  if (review.is_anonymous || !review.reviewer_name) {
    return "?";
  }

  const words = String(review.reviewer_name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const letters =
    words.length > 1
      ? [...words[0]][0] + [...words[words.length - 1]][0]
      : [...(words[0] ?? "?")].slice(0, 2).join("");

  return letters.toUpperCase();
}

/**
 * A stored UTC datetime as a short local date: "Sep 30, 2026".
 */
export function formatDate(value) {
  if (!value) {
    return "";
  }

  const parsed = new Date(`${String(value).replace(" ", "T")}Z`);

  return Number.isNaN(parsed.getTime())
    ? String(value)
    : parsed.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}
