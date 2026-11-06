import { __, sprintf } from "@wordpress/i18n";
import { StarIcon } from "lucide-react";
import { label } from "@/pages/profile/styles";
import { KINDS, RATINGS } from "../../lib/autoReply";
import RuleCell from "./RuleCell";

const head =
  "fhint:text-[11.5px] fhint:font-bold fhint:text-muted-strong fhint:uppercase";

/**
 * "How to reply": for each rating and kind of review, one of the owner's
 * templates, AI reply (coming soon), or no reply.
 *
 * @param {Object}   props
 * @param {Object}   props.rules        `{ 5: { comment, stars }, … }`.
 * @param {Object}   props.picks        The chosen template ids, same shape.
 * @param {Function} props.templatesFor `(rating, kind)` → templates there.
 * @param {Object}   props.errors       Messages by `rules.{rating}.{kind}`.
 * @param {Function} props.onChange     `(rating, kind, { source } | { pick })`.
 * @param {Function} props.onAdd        `(rating, kind)`: write a template there.
 */
export function RulesGrid({
  rules,
  picks,
  templatesFor,
  errors = {},
  onChange,
  onAdd,
}) {
  return (
    <div className="fhint:grid fhint:gap-2">
      <span className={label}>{__("How to reply", "foundhint-local-seo")}</span>
      <div className="fhint:grid fhint:grid-cols-[3.5rem_minmax(0,1fr)_minmax(0,1fr)] fhint:items-start fhint:gap-x-3 fhint:gap-y-2.5">
        <span className={head}>{__("Rating", "foundhint-local-seo")}</span>
        {KINDS.map(([kind, text]) => (
          <span key={kind} className={head}>
            {text()}
          </span>
        ))}
        {RATINGS.map((rating) => [
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
          ...KINDS.map(([kind, text]) => (
            <RuleCell
              key={`${rating}-${kind}`}
              name={sprintf(
                /* translators: 1: a star rating, 2: "With a comment" or "Stars only". */
                __("%1$d stars, %2$s", "foundhint-local-seo"),
                rating,
                text().toLowerCase(),
              )}
              source={rules[rating][kind]}
              pick={picks?.[rating]?.[kind] ?? 0}
              templates={templatesFor(rating, kind)}
              error={errors[`rules.${rating}.${kind}`]}
              onChange={(change) => onChange(rating, kind, change)}
              onAdd={() => onAdd(rating, kind)}
            />
          )),
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
