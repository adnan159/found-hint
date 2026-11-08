import { __ } from "@wordpress/i18n";
import { PlusIcon } from "lucide-react";
import { cn } from "cn";
import { focus } from "@/pages/profile/styles";

const dashed =
  "fhint:inline-flex fhint:items-center fhint:gap-2 fhint:border fhint:border-dashed fhint:border-input fhint:bg-card fhint:px-3 fhint:py-2 fhint:text-sm fhint:font-extrabold";

/**
 * The card's action: Add a template.
 *
 * @param {Object}   props
 * @param {Function} props.onAdd    Open the editor for a new template.
 */
export function CardActions({ onAdd }) {
  return (
    <>
      <button
        type="button"
        onClick={onAdd}
        className={cn(
          dashed,
          "fhint:cursor-pointer fhint:hover:bg-muted",
          focus,
        )}
      >
        <PlusIcon aria-hidden="true" className="fhint:size-3.5" />
        {__("Add a template", "foundhint-local-seo")}
      </button>
    </>
  );
}

export default CardActions;
