import { useState } from "react";
import RequestError from "@/components/RequestError";
import BlogCard from "./components/BlogCard";
import Composer from "./components/Composer";
import PostsHeader from "./components/PostsHeader";
import PostsNotice from "./components/PostsNotice";
import PostsSection from "./components/PostsSection";
import ReviewsCard from "./components/ReviewsCard";
import usePostList, { NO_FILTERS } from "./hooks/usePostList";
import { blankPost, reviewPost } from "./lib/posts";

/**
 * Posts & Scheduling: the posts on the Google listing of the location in
 * the bar at the top, and writing new ones.
 *
 * Everything here reads stored rows. "Sync posts", publishing, editing a
 * live post and deleting one are the only things that contact Google.
 *
 * Scheduling, CSV scheduling and sharing the website blog are FoundHint
 * Pro: drawn so they can be found, marked Pro, and inert.
 *
 * The list, its paging and Sync live in `usePostList`; this component only
 * lays the screen out.
 */
export default function Posts() {
  const list = usePostList();
  const [composing, setComposing] = useState(null);

  return (
    <>
      <PostsHeader
        ready={list.ready}
        hasListing={Boolean(list.listing)}
        onSync={list.onSync}
        syncing={list.syncing}
        onHistory={() =>
          list.setFilters({ ...NO_FILTERS, status: "live", sort: "new" })
        }
        onNewPost={() => setComposing(blankPost())}
      />

      <RequestError error={list.error} />

      {list.noLocations || list.noListing ? (
        <PostsNotice noLocations={list.noLocations} />
      ) : null}

      {list.listing ? (
        <div className="fhint:grid fhint:gap-5">
          <BlogCard blogPosts={list.state?.blog_posts ?? 0} />
          <ReviewsCard
            reviews={list.state?.reviews ?? []}
            onMakePost={(review) => setComposing(reviewPost(review))}
          />
          <PostsSection list={list} onEdit={setComposing} />
        </div>
      ) : null}

      {composing ? (
        <Composer
          post={composing}
          locationName={list.locationName}
          businessName={list.listing?.title ?? ""}
          website={list.state?.website ?? ""}
          uploadsReachable={list.state?.uploads_reachable ?? true}
          onClose={() => setComposing(null)}
        />
      ) : null}
    </>
  );
}
