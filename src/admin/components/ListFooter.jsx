import Pagination from "@/pages/reviews/components/Pagination";

/**
 * The foot of a list section: which items are showing on the left, then
 * the per-page choice and the page numbers. Moving to another page scrolls
 * back to the top, where the list starts. Reviews and Posts use it.
 *
 * @param {Object}   props
 * @param {string}   props.summary   "Showing 1 to 10 of 24".
 * @param {string}   [props.label]   Names the page navigation for screen readers.
 * @param {number}   props.page
 * @param {number}   props.pages
 * @param {number}   props.perPage
 * @param {Function} props.onPage
 * @param {Function} props.onPerPage
 */
export function ListFooter({
  summary,
  label,
  page,
  pages,
  perPage,
  onPage,
  onPerPage,
}) {
  return (
    <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-x-4 fhint:gap-y-2 fhint:border-t fhint:border-t-border fhint:px-5.5 fhint:py-3.5">
      <span className="fhint:text-[12.5px] fhint:font-semibold fhint:text-muted-strong">
        {summary}
      </span>
      <div className="fhint:min-w-0 fhint:flex-1">
        <Pagination
          label={label}
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

export default ListFooter;
