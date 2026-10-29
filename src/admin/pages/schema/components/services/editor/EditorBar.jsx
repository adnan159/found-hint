import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { dialogButton, groupHead, panelHeader, panelTitle } from "../../styles";

/**
 * The editor's heading row — a panel heading, as on every other panel:
 * which service is open, and the way to remove it (a saved one, when not
 * locked).
 */
export function EditorBar({ title, canRemove, onRemove }) {
  return (
    <div className={panelHeader}>
      <span className={groupHead}>{__("Editing", "foundhint-local-seo")}</span>
      <h2
        className={cn(panelTitle, "fhint:min-w-0 fhint:flex-1 fhint:truncate")}
      >
        {title}
      </h2>
      {canRemove ? (
        <button type="button" onClick={onRemove} className={dialogButton}>
          {__("Remove service", "foundhint-local-seo")}
        </button>
      ) : null}
    </div>
  );
}

export default EditorBar;
