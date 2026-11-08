import { __, _n, sprintf } from "@wordpress/i18n";
import { TriangleAlertIcon } from "lucide-react";
import { errorText, help } from "@/pages/profile/styles";

/**
 * What the photo field has to say under it: several photos on Google, a
 * photo Google cannot open, how photos travel on a private site, and errors.
 */
export function PhotoNotes({ mediaCount, reachable, uploadsReachable, error }) {
  return (
    <>
      {mediaCount > 1 ? (
        <span className={help}>
          {sprintf(
            /* translators: %d: number of photos and videos. */
            _n(
              "This post has %d photo or video on Google. Changing or removing the photo here replaces it.",
              "This post has %d photos and videos on Google. Changing or removing the photo here replaces all of them.",
              mediaCount,
              "foundhint-local-seo",
            ),
            mediaCount,
          )}
        </span>
      ) : null}
      {reachable === false ? (
        <span
          role="alert"
          className="fhint:flex fhint:gap-1.5 fhint:text-sm fhint:font-semibold fhint:text-destructive"
        >
          <TriangleAlertIcon
            aria-hidden="true"
            className="fhint:mt-0.5 fhint:size-3.5 fhint:flex-none"
          />
          {__(
            "Google cannot open photos stored on this site, because it is not on the public internet. Choose one from Your gallery instead.",
            "foundhint-local-seo",
          )}
        </span>
      ) : null}
      {uploadsReachable ? null : (
        <span className={help}>
          {__(
            "This site is not on the public internet, so Google cannot open a photo stored here. A photo you add is put on your Google profile's Photos first, and the post uses it from there.",
            "foundhint-local-seo",
          )}
        </span>
      )}
      {error ? (
        <span role="alert" className={errorText}>
          {error}
        </span>
      ) : null}
    </>
  );
}

export default PhotoNotes;
