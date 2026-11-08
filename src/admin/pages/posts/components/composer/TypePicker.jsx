import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { focus } from "@/pages/profile/styles";
import TypeIcon from "../TypeIcon";
import { TYPES, typeHint, typeLabel } from "../../lib/posts";

/**
 * Update, Event or Offer. A post on Google keeps its type — Google does not
 * allow it to change — so the other two are disabled then.
 */
export function TypePicker({ type, locked, onChange }) {
  return (
    <div
      role="radiogroup"
      aria-label={__("Post type", "foundhint-local-seo")}
      className="fhint:grid fhint:flex-none fhint:grid-cols-3 fhint:border-b fhint:border-b-border"
    >
      {TYPES.map((option) => {
        const on = option === type;

        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={locked && !on}
            onClick={() => onChange(option)}
            className={cn(
              "fhint:flex fhint:min-w-0 fhint:cursor-pointer fhint:items-center fhint:gap-2.5 fhint:border-0 fhint:border-b-2 fhint:px-4 fhint:py-2.5 fhint:text-left fhint:disabled:cursor-not-allowed fhint:disabled:opacity-50 fhint:[&+&]:border-l fhint:[&+&]:border-l-border",
              on
                ? "fhint:border-b-primary fhint:bg-card"
                : "fhint:border-b-transparent fhint:bg-muted/50 fhint:hover:bg-muted",
              focus,
            )}
          >
            <TypeIcon
              type={option}
              className="fhint:size-7"
              iconClassName="fhint:size-3.5"
            />
            <span className="fhint:grid fhint:min-w-0">
              <strong className="fhint:text-sm">{typeLabel(option)}</strong>
              <span className="fhint:truncate fhint:text-[11.5px] fhint:text-muted-strong">
                {typeHint(option)}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default TypePicker;
