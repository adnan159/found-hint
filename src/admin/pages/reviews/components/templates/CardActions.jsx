import { __ } from "@wordpress/i18n";
import { PlusIcon, UploadIcon } from "lucide-react";
import { cn } from "cn";
import { focus } from "@/pages/profile/styles";

const dashed =
  "fhint:inline-flex fhint:items-center fhint:gap-2 fhint:border fhint:border-dashed fhint:border-input fhint:bg-card fhint:px-3 fhint:py-2 fhint:text-sm fhint:font-extrabold";

/**
 * The card's two actions: Add a template, and Import from CSV (not built
 * yet — it says so, as Premium or as coming soon).
 *
 * @param {Object}   props
 * @param {boolean}  props.editable Premium serves templates.
 * @param {Function} props.onAdd    Open the editor for a new template.
 */
export function CardActions({ editable, onAdd }) {
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
      <button
        type="button"
        disabled
        title={
          editable
            ? __("Importing templates is coming soon.", "foundhint-local-seo")
            : __(
                "Importing templates is part of FoundHint Premium.",
                "foundhint-local-seo",
              )
        }
        className={cn(
          dashed,
          "fhint:cursor-not-allowed fhint:text-muted-foreground",
        )}
      >
        <UploadIcon aria-hidden="true" className="fhint:size-3.5" />
        {__("Import from CSV", "foundhint-local-seo")}
      </button>
    </>
  );
}

export default CardActions;
