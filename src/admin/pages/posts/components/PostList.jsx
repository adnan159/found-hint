import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { linkButton } from "@/pages/profile/styles";
import PostRow from "./PostRow";

/**
 * The page of posts inside the All posts section: placeholders while the
 * first page loads, a note when nothing matches (with a way to clear the
 * filters), else the posts one under another, split by hairlines.
 *
 * @param {Object}        props
 * @param {Array<Object>} props.items      The posts on this page.
 * @param {boolean}       props.loaded     Whether a page has arrived yet.
 * @param {boolean}       props.isFetching Whether a page is on its way.
 * @param {boolean}       props.filtered   Whether any filter is set.
 * @param {Function}      props.onClear    Clear the filters.
 * @param {Function}      props.onEdit     Receives the post to edit.
 */
export function PostList({
  items,
  loaded,
  isFetching,
  filtered,
  onClear,
  onEdit,
}) {
  if (isFetching && !loaded) {
    return (
      <div className="fhint:grid fhint:gap-4 fhint:p-5">
        <Skeleton className="fhint:h-20 fhint:w-full" />
        <Skeleton className="fhint:h-20 fhint:w-full" />
      </div>
    );
  }

  if (loaded && !items.length) {
    return (
      <Empty>
        <EmptyTitle>
          {filtered
            ? __("No posts match these filters", "foundhint-local-seo")
            : __("No posts yet", "foundhint-local-seo")}
        </EmptyTitle>
        <EmptyDescription>
          {filtered
            ? __(
                "Try a wider date range, or clear the filters to see everything.",
                "foundhint-local-seo",
              )
            : __(
                "Write your first post, or press Sync posts at the top to read the ones already on Google.",
                "foundhint-local-seo",
              )}
        </EmptyDescription>
        {filtered ? (
          <button type="button" onClick={onClear} className={linkButton}>
            {__("Clear filters", "foundhint-local-seo")}
          </button>
        ) : null}
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
      {items.map((post) => (
        <li key={post.id} className="fhint:m-0">
          <PostRow post={post} onEdit={() => onEdit(post)} />
        </li>
      ))}
    </ul>
  );
}

export default PostList;
