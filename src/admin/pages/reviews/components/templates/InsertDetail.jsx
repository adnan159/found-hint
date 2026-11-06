import { useId } from "react";
import { __ } from "@wordpress/i18n";
import { PlusIcon } from "lucide-react";
import { cn } from "cn";
import { focus, help, label } from "@/pages/profile/styles";
import { PLACEHOLDERS } from "../../lib/replies";

// A placeholder to insert: a pill that takes the accent on hover.
const insertChip = cn(
  "fhint:group fhint:inline-flex fhint:cursor-pointer fhint:items-center fhint:gap-1 fhint:rounded-full fhint:border fhint:border-input fhint:bg-card fhint:px-2.5 fhint:py-1 fhint:font-mono fhint:text-[11.5px] fhint:font-semibold fhint:text-foreground fhint:transition-colors",
  "fhint:hover:border-primary fhint:hover:bg-notice fhint:hover:text-notice-foreground fhint:active:scale-[0.97]",
  focus,
);

/**
 * "Insert a detail": one pill per placeholder, added to the reply where
 * the cursor is.
 *
 * @param {Object}   props
 * @param {Function} props.onInsert Receives the placeholder, e.g. "{{reviewer_name}}".
 */
export function InsertDetail({ onInsert }) {
  const id = useId();

  return (
    <div
      role="group"
      aria-labelledby={`${id}-insert`}
      aria-describedby={`${id}-insert-help`}
      className="fhint:grid fhint:gap-2.5 fhint:bg-[#faf6f4] fhint:px-4 fhint:py-3.5"
    >
      <div className="fhint:flex fhint:flex-wrap fhint:items-baseline fhint:gap-x-2 fhint:gap-y-0.5">
        <span id={`${id}-insert`} className={label}>
          {__("Insert a detail", "foundhint-local-seo")}
        </span>
        <span id={`${id}-insert-help`} className={help}>
          {__(
            "Added where the cursor is, and swapped for the real details when you reply.",
            "foundhint-local-seo",
          )}
        </span>
      </div>
      <div className="fhint:flex fhint:flex-wrap fhint:gap-2">
        {PLACEHOLDERS.map((placeholder) => (
          <button
            key={placeholder}
            type="button"
            onClick={() => onInsert(placeholder)}
            className={insertChip}
          >
            <PlusIcon
              aria-hidden="true"
              className="fhint:size-3 fhint:text-muted-strong fhint:transition-colors fhint:group-hover:text-primary"
            />
            {placeholder}
          </button>
        ))}
      </div>
    </div>
  );
}

export default InsertDetail;
