import { __, sprintf } from "@wordpress/i18n";
import { StarIcon } from "lucide-react";
import { cn } from "cn";
import { errorText, focus, label } from "@/pages/profile/styles";
import { dialogInput } from "../../styles";

const KINDS = [
  ["comment", () => __("With a comment", "foundhint-local-seo")],
  ["stars", () => __("Stars only", "foundhint-local-seo")],
];

/**
 * "How to reply": for each rating and kind of review, the owner's
 * templates (taking turns), the built-in reply, or no reply. A cell set to
 * templates with none says so, with "Add one".
 *
 * @param {Object}   props
 * @param {Object}   props.rules      `{ 5: { comment, stars }, … }`.
 * @param {Function} props.countFor   `(rating, kind)` → the owner's templates there.
 * @param {Object}   props.errors     Messages by `rules.{rating}.{kind}`.
 * @param {Function} props.onChange   `(rating, kind, source)`.
 * @param {Function} props.onAdd      `(rating, kind)`: write a template there.
 */
export function RulesGrid({ rules, countFor, errors = {}, onChange, onAdd }) {
  return (
    <div className="fhint:grid fhint:gap-2">
      <span className={label}>{__("How to reply", "foundhint-local-seo")}</span>
      <div className="fhint:grid fhint:grid-cols-[3.5rem_minmax(0,1fr)_minmax(0,1fr)] fhint:items-start fhint:gap-x-3 fhint:gap-y-2.5">
        <span className="fhint:text-[11.5px] fhint:font-bold fhint:text-muted-strong fhint:uppercase">
          {__("Rating", "foundhint-local-seo")}
        </span>
        {KINDS.map(([kind, text]) => (
          <span
            key={kind}
            className="fhint:text-[11.5px] fhint:font-bold fhint:text-muted-strong fhint:uppercase"
          >
            {text()}
          </span>
        ))}
        {[5, 4, 3, 2, 1].map((rating) => [
          <span
            key={`${rating}-n`}
            className="fhint:inline-flex fhint:items-center fhint:gap-1 fhint:pt-2 fhint:text-sm fhint:font-bold"
          >
            <StarIcon
              aria-hidden="true"
              className="fhint:size-3.5 fhint:fill-star fhint:text-star"
            />
            {rating}
          </span>,
          ...KINDS.map(([kind, text]) => {
            const source = rules[rating][kind];
            const count = countFor(rating, kind);
            const none = source === "template" && count === 0;
            const error = errors[`rules.${rating}.${kind}`];

            return (
              <span
                key={`${rating}-${kind}`}
                className="fhint:grid fhint:gap-1"
              >
                <select
                  value={source}
                  aria-label={sprintf(
                    /* translators: 1: a star rating, 2: "With a comment" or "Stars only". */
                    __("%1$d stars, %2$s", "foundhint-local-seo"),
                    rating,
                    text().toLowerCase(),
                  )}
                  onChange={(event) =>
                    onChange(rating, kind, event.target.value)
                  }
                  className={cn(
                    dialogInput,
                    "fhint:pr-8!",
                    source === "off" && "fhint:text-muted-strong",
                    (none || error) && "fhint:border-[#E8A317]",
                  )}
                >
                  <option value="template">
                    {__("My templates", "foundhint-local-seo")}
                  </option>
                  <option value="builtin">
                    {__("Built-in reply", "foundhint-local-seo")}
                  </option>
                  <option value="off">
                    {__("Don't reply", "foundhint-local-seo")}
                  </option>
                </select>
                {error && !none ? (
                  <span className={errorText}>{error}</span>
                ) : null}
                {none ? (
                  <span className="fhint:text-[12px] fhint:text-[#8a5a00]">
                    {__("No templates yet.", "foundhint-local-seo")}{" "}
                    <button
                      type="button"
                      onClick={() => onAdd(rating, kind)}
                      className={cn(
                        "fhint:cursor-pointer fhint:border-0 fhint:bg-transparent fhint:p-0 fhint:font-bold fhint:text-[#D8521F] fhint:underline",
                        focus,
                      )}
                    >
                      {__("Add one", "foundhint-local-seo")}
                    </button>
                  </span>
                ) : source === "template" && count > 1 ? (
                  <span className="fhint:text-[12px] fhint:text-muted-strong">
                    {sprintf(
                      /* translators: %d: templates for this rating and kind. */
                      __("%d templates take turns.", "foundhint-local-seo"),
                      count,
                    )}
                  </span>
                ) : null}
              </span>
            );
          }),
        ])}
      </div>
      <span className="fhint:text-[12.5px] fhint:text-muted-strong">
        {__(
          "We suggest replying to 1 and 2 star reviews yourself. Unhappy customers notice a personal reply.",
          "foundhint-local-seo",
        )}
      </span>
    </div>
  );
}

export default RulesGrid;
