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
 * Swap the placeholders in a reply for this review's details. One with no
 * value here — no city yet — is taken out, rather than left in curly
 * brackets on a public reply.
 */
export function fillPlaceholders(text, review, context = {}) {
  const firstName = firstNameOf(review);
  const values = {
    reviewer_name: firstName,
    location_name: context.locationName ?? "",
    location_city: context.locationCity ?? "",
    business_keyword: context.keyword ?? "",
    rating: String(review.star_rating ?? ""),
    review_text: String(review.comment ?? ""),
  };

  return String(text)
    .replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? "")
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/ {2,}/g, " ")
    .trim();
}

/**
 * The name to greet a reviewer by: their first name, or nothing for an
 * anonymous one.
 */
export function firstNameOf(review) {
  if (review.is_anonymous || !review.reviewer_name) {
    return "";
  }

  const first = String(review.reviewer_name).trim().split(/\s+/)[0];

  // "IMAM" reads as shouting in a reply; "Imam" does not.
  return first === first.toUpperCase() && first.length > 1
    ? first.charAt(0) + first.slice(1).toLowerCase()
    : first;
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
