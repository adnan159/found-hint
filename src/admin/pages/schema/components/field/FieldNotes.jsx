import { __, sprintf } from "@wordpress/i18n";
import { caption, fieldError } from "../styles";

/**
 * What sits under a field: the caption naming its Business Profile source
 * and the Schema.org property it becomes — so an error in Google's test
 * maps to exactly one field (doc §11.1, 13.16) — then a disagreement with
 * Google, and the error or the note that it is required.
 */
export function FieldNotes({ id, field, error, missing }) {
  return (
    <>
      <code id={`${id}-caption`} className={caption}>
        {[field.gbp, field.property].filter(Boolean).join(" · ")}
      </code>

      {field.disagrees ? (
        <span className="fhint:text-[12px] fhint:font-bold fhint:text-[#8a5a00]">
          {sprintf(
            /* translators: %s: Google's current value. */
            __(
              "Your website and Google disagree. Google now says: %s",
              "foundhint-local-seo",
            ),
            String(field.google_value ?? ""),
          )}
        </span>
      ) : null}

      {error ? (
        <span id={`${id}-error`} role="alert" className={fieldError}>
          {error}
        </span>
      ) : missing ? (
        <span className={fieldError}>
          {__(
            "Google needs this for a local business result.",
            "foundhint-local-seo",
          )}
        </span>
      ) : null}
    </>
  );
}

export default FieldNotes;
