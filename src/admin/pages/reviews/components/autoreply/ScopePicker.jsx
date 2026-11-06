import { __, sprintf } from "@wordpress/i18n";
import { cn } from "cn";
import { focus, label } from "@/pages/profile/styles";

/**
 * "Which reviews": new ones only, or the unanswered ones too.
 *
 * @param {Object}   props
 * @param {string}   props.scope      new | all.
 * @param {number}   props.unanswered Reviews with no reply yet.
 * @param {Function} props.onChange   Receives new | all.
 */
export function ScopePicker({ scope, unanswered, onChange }) {
  const options = [
    ["new", __("New reviews only", "foundhint-local-seo")],
    [
      "all",
      sprintf(
        /* translators: %d: reviews with no reply yet. */
        __("New and %d unanswered", "foundhint-local-seo"),
        unanswered,
      ),
    ],
  ];

  return (
    <div className="fhint:grid fhint:gap-2">
      <span className={label}>
        {__("Which reviews", "foundhint-local-seo")}
      </span>
      <div
        role="radiogroup"
        aria-label={__("Which reviews", "foundhint-local-seo")}
        className="fhint:flex fhint:w-fit fhint:flex-wrap fhint:gap-1 fhint:rounded-full fhint:bg-muted fhint:p-1"
      >
        {options.map(([value, text]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={scope === value}
            onClick={() => onChange(value)}
            className={cn(
              "fhint:cursor-pointer fhint:rounded-full fhint:border-0 fhint:px-3.5 fhint:py-1.75 fhint:text-[13px] fhint:font-bold fhint:whitespace-nowrap",
              scope === value
                ? "fhint:bg-card fhint:text-foreground fhint:shadow-sm"
                : "fhint:bg-transparent fhint:text-muted-strong",
              focus,
            )}
          >
            {text}
          </button>
        ))}
      </div>
      <span className="fhint:text-[12.5px] fhint:text-muted-strong">
        {scope === "all"
          ? sprintf(
              /* translators: %d: reviews with no reply yet. */
              __(
                "Replies to new reviews as they arrive, and to the %d that have no reply yet, oldest first.",
                "foundhint-local-seo",
              ),
              unanswered,
            )
          : __("Older reviews are left as they are.", "foundhint-local-seo")}
      </span>
    </div>
  );
}

export default ScopePicker;
