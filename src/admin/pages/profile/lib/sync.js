import { __, _n, sprintf } from "@wordpress/i18n";

/**
 * "2 hours ago", from a UTC timestamp as the server stores it.
 */
export function timeAgo(value) {
  if (!value) {
    return "";
  }

  const then = new Date(`${String(value).replace(" ", "T")}Z`).getTime();

  if (Number.isNaN(then)) {
    return "";
  }

  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));

  if (minutes < 1) {
    return __("just now", "foundhint-local-seo");
  }

  if (minutes < 60) {
    return sprintf(
      /* translators: %d: number of minutes. */
      _n("%d minute ago", "%d minutes ago", minutes, "foundhint-local-seo"),
      minutes,
    );
  }

  const hours = Math.round(minutes / 60);

  if (hours < 24) {
    return sprintf(
      /* translators: %d: number of hours. */
      _n("%d hour ago", "%d hours ago", hours, "foundhint-local-seo"),
      hours,
    );
  }

  const days = Math.round(hours / 24);

  return sprintf(
    /* translators: %d: number of days. */
    _n("%d day ago", "%d days ago", days, "foundhint-local-seo"),
    days,
  );
}

/**
 * Where the listing stands with Google, in a sentence — or nothing at all
 * while Google is not connected.
 */
export function googleSyncText(google) {
  // Nothing to report until Google is connected, so the line is left out.
  if (!google?.connected) {
    return "";
  }

  if (!google.mapped) {
    return __(
      "Google is connected, but no listing has been chosen for this location yet.",
      "foundhint-local-seo",
    );
  }

  const parts = [];

  // Whichever read was most recent: the listing itself, or its attributes
  // and photos. Both are "UTC, as stored", so they compare as text.
  const read = [google.synced_at, google.refreshed_at]
    .filter(Boolean)
    .sort()
    .pop();

  if (read) {
    parts.push(
      sprintf(
        /* translators: %s: a relative time, such as "2 hours ago". */
        __("Last read from Google %s.", "foundhint-local-seo"),
        timeAgo(read),
      ),
    );
  }

  if (google.pushed_at) {
    parts.push(
      sprintf(
        /* translators: %s: a relative time, such as "2 hours ago". */
        __("Last sent to Google %s.", "foundhint-local-seo"),
        timeAgo(google.pushed_at),
      ),
    );
  }

  return parts.length
    ? parts.join(" ")
    : __("Connected to your Google listing.", "foundhint-local-seo");
}
