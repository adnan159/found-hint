import { useState } from "react";
import { __, _n, sprintf } from "@wordpress/i18n";
import { cn } from "cn";
import { focus, label } from "@/pages/profile/styles";
import {
  builtInReply,
  fillPlaceholders,
  missingValues,
} from "../../lib/replies";

// A quick template: a rounded pill that fills the reply when pressed.
const pill = cn(
  "fhint:inline-flex fhint:cursor-pointer fhint:items-center fhint:rounded-full fhint:border fhint:border-input fhint:bg-card fhint:px-3.5 fhint:py-1.5 fhint:text-sm fhint:font-bold fhint:text-foreground fhint:hover:bg-muted",
  focus,
);

/**
 * The reply dialog's quick templates for the review's star rating, and the
 * built-in reply. Pressing one fills the reply with this review's details.
 * A detail this listing has none of (no city, no category) is left out —
 * and said so, since the sentence around it may need rewording.
 *
 * @param {Object}   props
 * @param {Object}   props.review    The review.
 * @param {Object}   props.context   From `replyContextFor()`.
 * @param {Object[]} props.templates This rating's templates.
 * @param {number}   props.rating    The review's stars, 0 for none.
 * @param {Function} props.onPick    Receives the filled reply.
 */
export function QuickTemplates({ review, context, templates, rating, onPick }) {
  const [gaps, setGaps] = useState([]);

  const pick = (text) => {
    setGaps(missingValues(text, review, context));
    onPick(fillPlaceholders(text, review, context));
  };

  return (
    <div className="fhint:grid fhint:gap-2">
      <span className={label}>
        {rating
          ? sprintf(
              /* translators: %d: a star rating from 1 to 5. */
              _n(
                "Quick templates for %d-star reviews",
                "Quick templates for %d-star reviews",
                rating,
                "foundhint-local-seo",
              ),
              rating,
            )
          : __("Quick templates", "foundhint-local-seo")}
      </span>
      <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2">
        {templates.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => pick(template.text)}
            className={pill}
          >
            {template.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setGaps([]);
            onPick(builtInReply(review, context));
          }}
          className={pill}
        >
          {__("Built-in reply", "foundhint-local-seo")}
        </button>
      </div>
      {gaps.length ? (
        <p
          role="status"
          className="fhint:m-0 fhint:text-[12.5px] fhint:text-[#8a5a00]"
        >
          {sprintf(
            /* translators: %s: placeholders, e.g. "{{location_city}}". */
            __(
              "This listing has no value for %s, so it was left out. Check the reply reads well before publishing.",
              "foundhint-local-seo",
            ),
            gaps.map((name) => `{{${name}}}`).join(", "),
          )}
        </p>
      ) : null}
    </div>
  );
}

export default QuickTemplates;
