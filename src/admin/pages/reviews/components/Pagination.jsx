import { useId } from "react";
import { __, sprintf } from "@wordpress/i18n";
import { cn } from "cn";
import { focus, quietButton, smallInput } from "@/pages/profile/styles";

export const PER_PAGE_OPTIONS = [5, 10, 25, 50, 100];

/**
 * The page numbers to show: the first, the last, and two either side of
 * the current one, with a gap marked where pages are skipped.
 */
function pagesToShow(page, pages) {
  const shown = new Set([1, pages, page - 1, page, page + 1]);
  const list = [...shown]
    .filter((n) => n >= 1 && n <= pages)
    .sort((a, b) => a - b);
  const withGaps = [];

  list.forEach((n, index) => {
    if (index && n - list[index - 1] > 1) {
      withGaps.push(`gap-${n}`);
    }

    withGaps.push(n);
  });

  return withGaps;
}

/**
 * Per page on the left; Previous, the page numbers and Next on the right.
 */
export function Pagination({ page, pages, perPage, onPage, onPerPage }) {
  const id = useId();

  return (
    <nav
      aria-label={__("Review pages", "foundhint-local-seo")}
      className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3"
    >
      <span className="fhint:flex fhint:items-center fhint:gap-2 fhint:text-[12.5px]">
        <label htmlFor={id}>{__("Per page", "foundhint-local-seo")}</label>
        <select
          id={id}
          value={perPage}
          onChange={(event) => onPerPage(Number(event.target.value))}
          // WordPress draws a select's arrow inside it, on the right; the
          // small input's tight padding would put the number under it.
          className={cn(smallInput, "fhint:min-w-[68px] fhint:pr-7!")}
        >
          {PER_PAGE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </span>

      {pages > 1 ? (
        <ul className="fhint:m-0 fhint:ml-auto fhint:flex fhint:list-none fhint:flex-wrap fhint:items-center fhint:gap-1.5 fhint:p-0">
          <li>
            <button
              type="button"
              onClick={() => onPage(page - 1)}
              disabled={page <= 1}
              className={quietButton}
            >
              {__("Previous", "foundhint-local-seo")}
            </button>
          </li>
          {pagesToShow(page, pages).map((n) =>
            typeof n === "string" ? (
              <li
                key={n}
                aria-hidden="true"
                className="fhint:px-1 fhint:text-muted-strong"
              >
                …
              </li>
            ) : (
              <li key={n}>
                <button
                  type="button"
                  onClick={() => onPage(n)}
                  aria-current={n === page ? "page" : undefined}
                  aria-label={sprintf(
                    /* translators: %d: a page number. */
                    __("Page %d", "foundhint-local-seo"),
                    n,
                  )}
                  className={cn(
                    "fhint:grid fhint:h-[30px] fhint:min-w-[30px] fhint:cursor-pointer fhint:place-items-center fhint:border fhint:px-2 fhint:text-[12.5px] fhint:font-extrabold",
                    n === page
                      ? "fhint:border-foreground fhint:bg-foreground fhint:text-background"
                      : "fhint:border-input fhint:bg-card fhint:text-foreground fhint:hover:bg-muted",
                    focus,
                  )}
                >
                  {n}
                </button>
              </li>
            ),
          )}
          <li>
            <button
              type="button"
              onClick={() => onPage(page + 1)}
              disabled={page >= pages}
              className={quietButton}
            >
              {__("Next", "foundhint-local-seo")}
            </button>
          </li>
        </ul>
      ) : null}
    </nav>
  );
}

export default Pagination;
