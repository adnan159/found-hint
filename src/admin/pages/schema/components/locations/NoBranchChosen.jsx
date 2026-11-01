import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { muted, panel, panelTitle } from "../styles";
import BranchButtons from "./BranchButtons";

/**
 * Shown in place of the editor while there is no branch to edit: none at
 * all (one location — Business schema covers it), or none chosen yet.
 */
export function NoBranchChosen({ branches, onBranch }) {
  if (!branches.length) {
    return (
      <section
        className={cn(
          panel,
          "fhint:grid fhint:justify-items-start fhint:gap-2 fhint:px-5 fhint:py-6",
        )}
      >
        <h2 className={panelTitle}>
          {__("Your business has one location", "foundhint-local-seo")}
        </h2>
        <p
          className={cn(
            muted,
            "fhint:m-0 fhint:max-w-[60ch] fhint:leading-relaxed",
          )}
        >
          {__(
            "Business schema already describes it, with its address and hours. Branches appear here when your Google account has more than one location.",
            "foundhint-local-seo",
          )}
        </p>
      </section>
    );
  }

  return (
    <section
      className={cn(panel, "fhint:grid fhint:gap-3 fhint:px-5 fhint:py-5")}
    >
      <h2 className={panelTitle}>
        {__("Location schema", "foundhint-local-seo")}
      </h2>
      <p
        className={cn(
          muted,
          "fhint:m-0 fhint:max-w-[64ch] fhint:leading-relaxed",
        )}
      >
        {__(
          "Your main location is selected at the top of the page. It is described in Business schema. Choose a branch to edit its schema — the top bar switches with it.",
          "foundhint-local-seo",
        )}
      </p>
      <BranchButtons branches={branches} onPick={onBranch} />
    </section>
  );
}

export default NoBranchChosen;
