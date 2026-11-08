import { __, sprintf } from "@wordpress/i18n";
import { blankPost, formatWhen } from "./posts";

/** The fields the server takes from the composer. */
const FIELDS = [
  "topic_type",
  "title",
  "summary",
  "cta_type",
  "cta_url",
  "starts_at",
  "ends_at",
  "coupon_code",
  "redeem_url",
  "terms",
  "media_url",
];

/** The form's starting values for a post (or a starting point). */
export function formFromPost(post) {
  return {
    ...blankPost(post?.topic_type ?? "update"),
    ...(post ?? {}),
    starts_at: post?.starts_at ?? "",
    ends_at: post?.ends_at ?? "",
  };
}

/** What a save sends: the form's fields, nothing the server owns. */
export function fieldsOf(form) {
  return {
    ...Object.fromEntries(FIELDS.map((field) => [field, form[field]])),
    attachment_id: form.attachment_id || 0,
  };
}

/** The When choice a post opens with. */
export function initialWhen(post) {
  return { draft: "draft", scheduled: "schedule" }[post?.status] ?? "now";
}

/**
 * Tomorrow at 9:00, as a datetime-local value — where the picker starts for
 * a post that has no time yet.
 */
export function defaultScheduleAt() {
  const at = new Date();

  at.setDate(at.getDate() + 1);

  const pad = (n) => String(n).padStart(2, "0");

  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}T09:00`;
}

/** The main button's words. */
export function primaryLabel({ saving, onGoogle, when }) {
  if (saving) {
    return when === "schedule" && !onGoogle
      ? __("Scheduling…", "foundhint-local-seo")
      : __("Sending…", "foundhint-local-seo");
  }

  if (onGoogle) {
    return __("Update on Google", "foundhint-local-seo");
  }

  return (
    {
      draft: __("Save draft", "foundhint-local-seo"),
      schedule: __("Schedule post", "foundhint-local-seo"),
    }[when] ?? __("Publish to Google", "foundhint-local-seo")
  );
}

/** The footer line beside the buttons. */
export function footerNote({ onGoogle, when }) {
  if (onGoogle || when === "now") {
    return __(
      "Publishing posts this on your Google profile.",
      "foundhint-local-seo",
    );
  }

  return when === "schedule"
    ? __("Nothing is sent before the time you chose.", "foundhint-local-seo")
    : __("Drafts are kept on this site only.", "foundhint-local-seo");
}

/** What the toast says after a save. */
export function savedMessage({ onGoogle, when, scheduleAt, canSchedule }) {
  if (onGoogle) {
    return __("Your post was updated on Google.", "foundhint-local-seo");
  }

  if (when === "schedule" && !canSchedule) {
    return __(
      "Changes saved. The post waits for FoundHint Premium to send it.",
      "foundhint-local-seo",
    );
  }

  if (when === "schedule") {
    return sprintf(
      /* translators: %s: a date and time, e.g. "Nov 6, 2026, 9:00 AM". */
      __("Scheduled. It will go out on %s.", "foundhint-local-seo"),
      formatWhen(scheduleAt, true),
    );
  }

  return when === "now"
    ? __("Your post was published on Google.", "foundhint-local-seo")
    : __("Draft saved.", "foundhint-local-seo");
}
