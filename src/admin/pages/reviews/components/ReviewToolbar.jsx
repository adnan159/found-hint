import { __, _n, sprintf } from "@wordpress/i18n";
import { ChevronDownIcon, DownloadIcon } from "lucide-react";
import { cn } from "cn";
import { quietButton } from "@/pages/profile/styles";
import BrandCheckbox from "@/components/BrandCheckbox";
import SoonTag from "./SoonTag";

/**
 * Above the list: select the page, how many are selected, which reviews
 * are showing, and what can be done with them.
 *
 * Export works on the selection when there is one, else on every review
 * that matches the filters. Bulk actions — replying to many at once — need
 * templates or AI replies, so they wait for those.
 */
export function ReviewToolbar({
  pageIds,
  selected,
  onSelectPage,
  onClear,
  from,
  to,
  total,
  filtered,
  onExport,
  exporting,
}) {
  const allOnPage =
    pageIds.length > 0 && pageIds.every((id) => selected.includes(id));

  return (
    <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3 fhint:border fhint:border-border fhint:bg-card fhint:px-4 fhint:py-2.5">
      <div className="fhint:flex fhint:items-center fhint:gap-2.5 fhint:text-[13px] fhint:font-bold">
        <BrandCheckbox
          checked={allOnPage}
          onCheckedChange={(on) => onSelectPage(Boolean(on))}
          aria-label={__(
            "Select every review on this page",
            "foundhint-local-seo",
          )}
          disabled={!pageIds.length}
        />
        <span aria-live="polite">
          {sprintf(
            /* translators: %d: number of reviews selected. */
            _n(
              "%d selected",
              "%d selected",
              selected.length,
              "foundhint-local-seo",
            ),
            selected.length,
          )}
        </span>
      </div>

      <span
        aria-live="polite"
        className="fhint:ml-auto fhint:text-[12.5px] fhint:text-muted-strong"
      >
        {total
          ? sprintf(
              /* translators: 1: first review shown, 2: last review shown, 3: how many match. */
              __("Showing %1$d to %2$d of %3$d", "foundhint-local-seo"),
              from,
              to,
              total,
            )
          : filtered
            ? __("No reviews match these filters", "foundhint-local-seo")
            : __("No reviews yet", "foundhint-local-seo")}
      </span>

      <button
        type="button"
        onClick={onExport}
        disabled={!total || exporting}
        className={quietButton}
      >
        <DownloadIcon aria-hidden="true" className="fhint:size-3.5" />
        {exporting
          ? __("Exporting…", "foundhint-local-seo")
          : selected.length
            ? __("Export selected", "foundhint-local-seo")
            : __("Export CSV", "foundhint-local-seo")}
      </button>
      <button
        type="button"
        onClick={onClear}
        disabled={!selected.length}
        className={quietButton}
      >
        {__("Clear", "foundhint-local-seo")}
      </button>
      <button
        type="button"
        disabled
        title={__(
          "Replying to many reviews at once comes with templates and AI replies.",
          "foundhint-local-seo",
        )}
        className={cn(quietButton, "fhint:gap-2")}
      >
        {__("Bulk actions", "foundhint-local-seo")}
        <SoonTag className="fhint:hidden fhint:sm:inline" />
        <ChevronDownIcon aria-hidden="true" className="fhint:size-3.5" />
      </button>
    </div>
  );
}

export default ReviewToolbar;
