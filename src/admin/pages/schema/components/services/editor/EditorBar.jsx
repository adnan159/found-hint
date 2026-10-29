import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { focus } from "@/pages/profile/styles";

/**
 * The dark bar on top of the editor: which service is open, and the way to
 * remove it (a saved one, when not locked).
 */
export function EditorBar({ title, canRemove, onRemove }) {
  return (
    <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3 fhint:bg-[#201e1d] fhint:px-5 fhint:py-3 fhint:text-white">
      <span className="fhint:text-[11px] fhint:font-bold fhint:tracking-[0.08em] fhint:text-[#bab6b6] fhint:uppercase">
        {__("Editing", "foundhint-local-seo")}
      </span>
      <strong className="fhint:min-w-0 fhint:flex-1 fhint:truncate fhint:text-[14px]">
        {title}
      </strong>
      {canRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className={cn(
            "fhint:cursor-pointer fhint:border fhint:border-[#625e5e] fhint:bg-transparent fhint:px-2.5 fhint:py-1 fhint:text-[12px] fhint:font-bold fhint:text-white",
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
