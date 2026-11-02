import { __ } from "@wordpress/i18n";
import { formatDate } from "./replies";

/** One CSV cell, quoted, with a leading formula character neutralised. */
function cell(value) {
  let text = String(value ?? "");

  // A cell starting with = + - or @ is run as a formula by spreadsheets;
  // a review is someone else's words and must never run as one.
  if (/^[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * Reviews as a CSV file's text: one row per review, with a header row.
 *
 * @param {Array<Object>} reviews Stored reviews.
 * @return {string} CSV text.
 */
export function toCsv(reviews) {
  const header = [
    __("Reviewer", "foundhint-local-seo"),
    __("Rating", "foundhint-local-seo"),
    __("Date", "foundhint-local-seo"),
    __("Review", "foundhint-local-seo"),
    __("Review status", "foundhint-local-seo"),
    __("Your reply", "foundhint-local-seo"),
    __("Replied on", "foundhint-local-seo"),
  ];
  const rows = reviews.map((review) => [
    review.is_anonymous
      ? __("Anonymous", "foundhint-local-seo")
      : review.reviewer_name,
    review.star_rating,
    formatDate(review.reviewed_at),
    review.comment,
    review.status,
    review.reply_comment,
    formatDate(review.replied_at),
  ]);

  // The byte-order mark makes Excel read the file as UTF-8, so names in
  // Bengali or with accents arrive intact.
  return `\uFEFF${[header, ...rows].map((row) => row.map(cell).join(",")).join("\r\n")}`;
}

/**
 * Hand the browser a CSV file to save.
 *
 * @param {string} name File name.
 * @param {string} text File contents.
 */
export function downloadCsv(name, text) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");

  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
