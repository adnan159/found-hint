import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import ReviewCard from "./ReviewCard";

/**
 * The page of reviews inside the All reviews section: placeholders while
 * the first page loads, a note when nothing matches, else the reviews
 * one under another, split by hairlines.
 *
 * @param {Object}        props
 * @param {Array<Object>} props.items      The reviews on this page.
 * @param {boolean}       props.loaded     Whether a page has arrived yet.
 * @param {boolean}       props.isFetching Whether a page is on its way.
 * @param {boolean}       props.filtered   Whether any filter is set.
 * @param {Function}      props.onReply    Receives the review to reply to.
 */
export function ReviewList({ items, loaded, isFetching, filtered, onReply }) {
  if (isFetching && !loaded) {
    return (
      <div className="fhint:grid fhint:gap-4 fhint:p-5">
        <Skeleton className="fhint:h-28 fhint:w-full" />
        <Skeleton className="fhint:h-28 fhint:w-full" />
      </div>
    );
  }

  if (loaded && !items.length) {
    return (
      <Empty>
        <EmptyTitle>
          {filtered
            ? __("No reviews match these filters", "foundhint-local-seo")
            : __("No reviews stored yet", "foundhint-local-seo")}
        </EmptyTitle>
        <EmptyDescription>
          {filtered
            ? __(
                "Try a different rating, status or search.",
                "foundhint-local-seo",
              )
            : __(
                "Press Sync reviews at the top to read the reviews on your Google profile.",
                "foundhint-local-seo",
              )}
        </EmptyDescription>
      </Empty>
    );
  }

  if (!items.length) {
    return null;
  }

  return (
    <ul
      aria-busy={isFetching ? "true" : undefined}
      className={cn(
        "fhint:m-0 fhint:list-none fhint:divide-y fhint:divide-border fhint:p-0",
        isFetching && "fhint:opacity-60",
      )}
    >
      {items.map((review) => (
        <li key={review.review_id} className="fhint:m-0">
          <ReviewCard review={review} onReply={() => onReply(review)} />
        </li>
      ))}
    </ul>
  );
}

export default ReviewList;
