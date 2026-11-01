import Pagination from "./Pagination";
import { showingText } from "./ReviewToolbar";

/**
 * The foot of the All reviews section: which reviews are showing, then the
 * per-page choice and the page numbers. Moving to another page scrolls back
 * to the top, where the list starts.
 */
export function ReviewListFooter({
  from,
  to,
  total,
  page,
  pages,
  perPage,
  onPage,
  onPerPage,
}) {
  return (
    <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-x-4 fhint:gap-y-2 fhint:border-t fhint:border-t-border fhint:px-[22px] fhint:py-3.5">
      <span className="fhint:text-[12.5px] fhint:font-semibold fhint:text-muted-strong">
        {showingText({ from, to, total })}
      </span>
      <div className="fhint:min-w-0 fhint:flex-1">
        <Pagination
          page={page}
          pages={pages}
          perPage={perPage}
          onPage={(next) => {
            onPage(next);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onPerPage={onPerPage}
        />
      </div>
    </div>
  );
}

export default ReviewListFooter;
