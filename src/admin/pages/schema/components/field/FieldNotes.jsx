import { __, sprintf } from "@wordpress/i18n";
import {
  DESCRIPTION_RANGE,
  descriptionLength,
  profileCoverage,
  repeatedPhrase,
} from "../../lib/guidance";
import { caption, fieldError } from "../styles";

const ADVICE = "fhint:text-[12.5px] fhint:text-muted-strong";
const WARN =
  "fhint:text-[12.5px] fhint:font-bold fhint:text-warning-foreground";

/** Length and repetition, under the description (QA D8). */
function DescriptionAdvice({ value }) {
  const text = String(value ?? "");
  const state = descriptionLength(text);
  const repeated = repeatedPhrase(text);

  if (state === "empty") {
    return null;
  }

  return (
    <>
      <span className={state === "good" ? ADVICE : WARN}>
        {sprintf(
          /* translators: 1: characters written, 2: lower guide, 3: upper guide. */
          __("%1$d characters — aim for %2$d to %3$d.", "foundhint-local-seo"),
          text.trim().length,
          DESCRIPTION_RANGE[0],
          DESCRIPTION_RANGE[1],
        )}{" "}
        {state === "short"
          ? __("Say what you do and for whom.", "foundhint-local-seo")
          : state === "long"
            ? __(
                "Search results cut it off; keep the first sentences strongest.",
                "foundhint-local-seo",
              )
            : null}
      </span>
      {repeated ? (
        <span className={WARN}>
          {sprintf(
            /* translators: 1: a repeated phrase, 2: how many times. */
            __(
              "“%1$s” appears %2$d times. Say it once and describe what you offer instead — repetition reads as keyword stuffing.",
              "foundhint-local-seo",
            ),
            repeated.phrase,
            repeated.count,
          )}
        </span>
      ) : null}
    </>
  );
}

/** Which profiles are listed, and common ones to add (QA D7). */
function ProfileAdvice({ value }) {
  const { found, missing } = profileCoverage(value);

  return (
    <span className={ADVICE}>
      {found.length
        ? sprintf(
            /* translators: %s: profile sites, e.g. "Facebook, X". */
            __("Listed: %s.", "foundhint-local-seo"),
            found.join(", "),
          )
        : __("No profiles listed yet.", "foundhint-local-seo")}{" "}
      {missing.length
        ? sprintf(
            /* translators: %s: profile sites. */
            __(
              "Add any official profile you have — %s, and GitHub or WordPress.org for software. Each one helps Google match your business to its profiles.",
              "foundhint-local-seo",
            ),
            missing.join(", "),
          )
        : null}
    </span>
  );
}

/**
 * What sits under a field: the caption naming its Business Profile source
 * and the Schema.org property it becomes — so an error in Google's test
 * maps to exactly one field (doc §11.1, 13.16) — then a disagreement with
 * Google, how a phone number is printed, and the error or the note that it
 * is required.
 */
export function FieldNotes({ id, field, value, error, missing }) {
  // A phone number is printed in international form (QA D2). The server
  // says how, for the value it holds; an edit shows in the preview.
  const phone =
    field.printed !== undefined && !error && String(value ?? "").trim()
      ? value === field.value
        ? field.printed
          ? field.printed !== String(value).trim()
            ? "printed"
            : null
          : "local"
        : null
      : null;

  return (
    <>
      <code id={`${id}-caption`} className={caption}>
        {[field.gbp, field.property].filter(Boolean).join(" · ")}
      </code>

      {field.disagrees ? (
        <span className="fhint:text-[12.5px] fhint:font-bold fhint:text-warning-foreground">
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

      {field.key === "description" ? <DescriptionAdvice value={value} /> : null}
      {field.key === "social" ? <ProfileAdvice value={value} /> : null}

      {phone === "printed" ? (
        <span className="fhint:text-[12.5px] fhint:text-muted-strong">
          {sprintf(
            /* translators: %s: the phone number in international form. */
            __("Printed as %s", "foundhint-local-seo"),
            field.printed,
          )}
        </span>
      ) : phone === "local" ? (
        <span className="fhint:text-[12.5px] fhint:font-bold fhint:text-warning-foreground">
          {__(
            "Not printed: add the country code (such as +880), or set the business country, so it can be written in international form.",
            "foundhint-local-seo",
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
