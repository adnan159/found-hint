import { __ } from "@wordpress/i18n";
import { blankPost } from "./posts";

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
  return post?.status === "draft" ? "draft" : "now";
}

/** The main button's words. */
export function primaryLabel({ saving, onGoogle, when }) {
  if (saving) {
    return __("Sending…", "foundhint-local-seo");
  }

  if (onGoogle) {
    return __("Update on Google", "foundhint-local-seo");
  }

  return when === "draft"
    ? __("Save draft", "foundhint-local-seo")
    : __("Publish to Google", "foundhint-local-seo");
}

/** The footer line beside the buttons. */
export function footerNote({ onGoogle, when }) {
  if (onGoogle || when === "now") {
    return __(
      "Publishing posts this on your Google profile.",
      "foundhint-local-seo",
    );
  }

  return __("Drafts are kept on this site only.", "foundhint-local-seo");
}

/** What the toast says after a save. */
export function savedMessage({ onGoogle, when }) {
  if (onGoogle) {
    return __("Your post was updated on Google.", "foundhint-local-seo");
  }

  return when === "now"
    ? __("Your post was published on Google.", "foundhint-local-seo")
    : __("Draft saved.", "foundhint-local-seo");
}
