import { __, sprintf } from "@wordpress/i18n";
import { DownloadIcon, MessageSquareIcon } from "lucide-react";
import Hint from "@/components/Hint";
import { dialogButton } from "../styles";
import Panel from "./Panel";

/**
 * Which reviews are showing: "Showing 1 to 10 of 24". Said under the
 * section title and again beside the page numbers at the foot of the list.
 */
export function showingText({ from, to, total, filtered }) {
  if (total) {
    return sprintf(
      /* translators: 1: first review shown, 2: last review shown, 3: how many match. */
      __("Showing %1$d to %2$d of %3$d", "foundhint-local-seo"),
      from,
      to,
      total,
    );
  }

  return filtered
    ? __("No reviews match these filters", "foundhint-local-seo")
    : __("No reviews yet", "foundhint-local-seo");
}

/**
 * The one section that holds the reviews, drawn as a Business Profile
 * section: which reviews are showing under the title, the export beside it,
 * then the filters, the list and the pages in the body.
 *
 * Export writes every review that matches the filters.
 */
export function ReviewToolbar({
  from,
  to,
  total,
  filtered,
  onExport,
  exporting,
  children,
}) {
  return (
    <Panel
      icon={MessageSquareIcon}
      title={__("All reviews", "foundhint-local-seo")}
      bodyClassName="fhint:gap-0 fhint:p-0"
      after={
        <Hint
          about={__("All reviews", "foundhint-local-seo")}
          text={__(
            "Narrow the list by rating, reply status or words in a review. Export CSV writes every review that matches.",
            "foundhint-local-seo",
          )}
        />
      }
      description={showingText({ from, to, total, filtered })}
      actions={
        <button
          type="button"
          onClick={onExport}
          disabled={!total || exporting}
          className={dialogButton}
        >
          <DownloadIcon aria-hidden="true" className="fhint:size-3.5" />
          {exporting
            ? __("Exporting…", "foundhint-local-seo")
            : __("Export CSV", "foundhint-local-seo")}
        </button>
      }
    >
      {children}
    </Panel>
  );
}

export default ReviewToolbar;
