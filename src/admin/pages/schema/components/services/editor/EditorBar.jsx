import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { focus } from "@/pages/profile/styles";

/**
 * The black bar between the list and the form (design): "Editing", which
 * service is open, and the way to remove it (a saved one, when not locked).
 */
export function EditorBar({ title, canRemove, onRemove }) {
  return (
    <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2.5 fhint:bg-[#201e1d] fhint:px-5 fhint:py-3 fhint:text-white">
      <span className="fhint:text-[11.5px] fhint:font-bold fhint:tracking-[0.06em] fhint:text-[#cfcaca] fhint:uppercase">
        {__("Editing", "foundhint-local-seo")}
      </span>
      <h2 className="fhint:m-0 fhint:min-w-0 fhint:flex-1 fhint:truncate fhint:text-[14px] fhint:font-bold fhint:text-white">
        {title}
      </h2>
      {canRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className={cn(
            "fhint:cursor-pointer fhint:border fhint:border-[#625e5e] fhint:bg-transparent fhint:px-[11px] fhint:py-[5px] fhint:text-[12px] fhint:font-bold fhint:text-white fhint:hover:border-white",
            focus,
          )}
        >
          {__("Remove service", "foundhint-local-seo")}
        </button>
      ) : null}
    </div>
  );
}

export default EditorBar;
