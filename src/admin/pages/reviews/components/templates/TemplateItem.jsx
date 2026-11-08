import { __, _n, sprintf } from "@wordpress/i18n";
import { PencilIcon, StarIcon } from "lucide-react";
import { cn } from "cn";
import { tag, tagTones } from "@/pages/profile/styles";
import { iconButton } from "../../styles";

/**
 * One template in the card: its name, kind, an edit button, the rating it
 * answers (stars, and the number in words for screen readers) and the
 * start of its text.
 *
 * @param {Object}   props
 * @param {Object}   props.template `{ id, rating, kind, name, text }`.
 * @param {Function} props.onEdit   Open it in the editor.
 */
export function TemplateItem({ template, onEdit }) {
  return (
    <li className="fhint:grid fhint:gap-1 fhint:border fhint:border-border fhint:px-3 fhint:py-2.5">
      <span className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2">
        <strong className="fhint:text-sm">{template.name}</strong>
        <span
          className={cn(
            tag,
            tagTones.quiet,
            "fhint:border fhint:border-border",
          )}
        >
          {template.kind === "comment"
            ? __("With comment", "foundhint-local-seo")
            : __("Stars only", "foundhint-local-seo")}
        </span>
        <button
          type="button"
          onClick={() => onEdit(template)}
          className={cn(iconButton, "fhint:ml-auto")}
        >
          <PencilIcon aria-hidden="true" className="fhint:size-3.5" />
          <span className="fhint:sr-only">
            {sprintf(
              /* translators: %s: the template name. */
              __("Edit %s", "foundhint-local-seo"),
              template.name,
            )}
          </span>
        </button>
      </span>
      <span className="fhint:-mt-1 fhint:mb-2 fhint:inline-flex fhint:items-center fhint:gap-0.5">
        {Array.from({ length: template.rating }, (_, index) => (
          <StarIcon
            key={index}
            aria-hidden="true"
            className="fhint:size-3 fhint:flex-none fhint:fill-star fhint:text-star"
          />
        ))}
        <span className="fhint:sr-only">
          {sprintf(
            /* translators: %d: a star rating from 1 to 5. */
            _n(
              "For %d-star reviews",
              "For %d-star reviews",
              template.rating,
              "foundhint-local-seo",
            ),
            template.rating,
          )}
        </span>
      </span>
      <span className="fhint:line-clamp-3 fhint:text-sm fhint:leading-snug fhint:text-muted-strong">
        {template.text}
      </span>
    </li>
  );
}

export default TemplateItem;
