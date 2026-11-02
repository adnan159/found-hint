import { __ } from "@wordpress/i18n";
import { NewspaperIcon } from "lucide-react";
import Hint from "@/components/Hint";
import ListFooter from "@/components/ListFooter";
import Panel from "@/components/Panel";
import { showingText } from "../lib/posts";
import { NO_FILTERS } from "../hooks/usePostList";
import PostFilters from "./PostFilters";
import PostList from "./PostList";

/**
 * The one section that holds the posts, as the Reviews screen's All
 * reviews: which posts are showing under the title, then the filters, the
 * list and the pages.
 *
 * @param {Object}   props
 * @param {Object}   props.list   What `usePostList` returns.
 * @param {Function} props.onEdit Receives the post to open in the composer.
 */
export function PostsSection({ list, onEdit }) {
  const summary = list.total
    ? showingText(list.from, list.to, list.total)
    : list.filtered
      ? __("No posts match these filters", "foundhint-local-seo")
      : __("No posts yet", "foundhint-local-seo");

  return (
    <Panel
      icon={NewspaperIcon}
      title={__("All posts", "foundhint-local-seo")}
      after={
        <Hint
          about={__("All posts", "foundhint-local-seo")}
          text={__(
            "Every post on this location's Google listing, and the drafts and failed posts kept here. Narrow the list by type, status, time or source.",
            "foundhint-local-seo",
          )}
        />
      }
      description={summary}
      bodyClassName="fhint:gap-0 fhint:p-0"
    >
      <div className="fhint:border-b fhint:border-b-border fhint:p-5">
        <PostFilters
          filters={list.filters}
          counts={list.counts}
          onChange={list.setFilters}
        />
      </div>

      <PostList
        items={list.items}
        loaded={list.loaded}
        isFetching={list.isFetching}
        filtered={list.filtered}
        onClear={() => list.setFilters(NO_FILTERS)}
        onEdit={onEdit}
      />

      {list.total ? (
        <ListFooter
          summary={summary}
          label={__("Post pages", "foundhint-local-seo")}
          page={list.page}
          pages={list.pages}
          perPage={list.perPage}
          onPage={list.setPage}
          onPerPage={list.setPerPage}
        />
      ) : null}
    </Panel>
  );
}

export default PostsSection;
