import { __ } from "@wordpress/i18n";
import { warningNote } from "../styles";

/**
 * Where a branch's placement would not do what its owner means: every page
 * claiming every branch, or chosen pages with none chosen.
 */
export function PlacementWarnings({ placement, postIds, branchCount }) {
  return (
    <>
      {placement === "every_page" && branchCount > 1 ? (
        <p className={warningNote}>
          {__(
            "With more than one branch, every page would claim every branch. Choose each branch's own pages instead.",
            "foundhint-local-seo",
          )}
        </p>
      ) : null}
      {placement === "chosen" && !postIds.length ? (
        <p className={warningNote}>
          {__(
            "No pages chosen yet, so this branch prints nowhere. Pick its page, and your Contact page.",
            "foundhint-local-seo",
          )}
        </p>
      ) : null}
    </>
  );
}

export default PlacementWarnings;
