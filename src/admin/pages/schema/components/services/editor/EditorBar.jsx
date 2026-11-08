import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { PencilIcon } from "lucide-react";
import { quietButton } from "@/pages/profile/styles";
import { panel, panelHeader, panelTitle } from "../../styles";

/**
 * The editor's head card: which service is open, and the way to remove it
 * (a saved one, when not locked).
 */
export function EditorBar({ title, canRemove, onRemove }) {
  return (
    <div className={cn(panel, "fhint:*:border-b-0")}>
      <div className={panelHeader}>
        <span
          aria-hidden="true"
          className="fhint:grid fhint:size-5.5 fhint:flex-none fhint:place-items-center fhint:text-muted-strong"
        >
          <PencilIcon className="fhint:size-4" />
        </span>
        <span className="fhint:grid fhint:min-w-0 fhint:flex-1 fhint:gap-0.5">
          <span className="fhint:text-[11.5px] fhint:font-bold fhint:tracking-[0.06em] fhint:text-muted-strong fhint:uppercase">
            {__("Editing", "foundhint-local-seo")}
          </span>
          <h2 className={cn(panelTitle, "fhint:truncate")}>{title}</h2>
        </span>
        {canRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className={cn(
              quietButton,
              "fhint:px-3 fhint:py-1.5 fhint:text-destructive",
            )}
          >
            {__("Remove service", "foundhint-local-seo")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default EditorBar;
