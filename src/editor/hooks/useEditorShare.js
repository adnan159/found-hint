import { useState } from "react";
import { hasPro } from "@/lib/pro";
import { useGetBlogPostQuery } from "@/store/api/postBlogApi";
import { useGetPostStateQuery } from "@/store/api/postsApi";
import { blogPost } from "@/pages/posts/lib/posts";

/**
 * What the editor's GBP Posting popup needs before the composer can open:
 * Premium, the Google listings, which one to post to (asked when there are
 * several), and the blog post as a draft.
 *
 * @param {number} postId The blog post being edited.
 * @return {Object} `step` — loading | premium | no_listing | unpublished |
 *                  choose | compose — and what that step shows.
 */
export function useEditorShare(postId) {
  const premium = hasPro("posts.blog");
  const [chosen, setChosen] = useState("");
  const { data: all, isLoading: listingsLoading } = useGetPostStateQuery({
    locationName: "",
  });
  const listings = all?.locations ?? [];
  const locationName =
    chosen || (listings.length === 1 ? listings[0].location_name : "");
  const listing = listings.find((item) => item.location_name === locationName);
  const { data: state } = useGetPostStateQuery(
    { locationName },
    { skip: !locationName },
  );
  const {
    currentData: blog,
    error: blogError,
    isFetching: blogLoading,
  } = useGetBlogPostQuery(postId, { skip: !premium || !postId });

  let step = "compose";

  if (!premium) {
    step = "premium";
  } else if (listingsLoading || blogLoading) {
    step = "loading";
  } else if (blogError || !blog) {
    step = "unpublished";
  } else if (!listings.length) {
    step = "no_listing";
  } else if (!locationName) {
    step = "choose";
  } else if (!state) {
    step = "loading";
  }

  return {
    step,
    listings,
    choose: setChosen,
    listing,
    locationName,
    state,
    blog,
    post: blog ? blogPost(blog) : null,
  };
}

export default useEditorShare;
