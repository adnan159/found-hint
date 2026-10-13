import { __ } from "@wordpress/i18n";
import { tagTones } from "../../styles";

/**
 * A smaller copy of a photo, where Google can make one.
 *
 * Google serves a listing's photos at full camera size, and its image host
 * resizes on request when a size is appended to the address. Anything that
 * is not on that host — a file in this site's media library — is used as it
 * is.
 */
export function thumb(url, size = 400) {
  const value = String(url ?? "");

  if (!/^https:\/\/lh\d+\.googleusercontent\.com\//.test(value)) {
    return value;
  }

  // Google often hands the address over already asking for full size
  // (`=s0`); that request is replaced, not added to.
  return `${value.replace(/=[^/=]*$/, "")}=w${size}-h${size}-c`;
}
// Where a chosen photo stands on its way to Google.
export const STATES = {
  pending: {
    tone: tagTones.accent,
    label: () => __("Ready to upload", "foundhint-local-seo"),
  },
  uploading: {
    tone: tagTones.quiet,
    label: () => __("Uploading…", "foundhint-local-seo"),
  },
  failed: {
    tone: tagTones.bad,
    label: () => __("Not accepted", "foundhint-local-seo"),
  },
};
