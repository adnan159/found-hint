import { useEffect } from "react";
import { __ } from "@wordpress/i18n";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { errorMessage } from "@/lib/errors";
import { hasPro } from "@/lib/pro";
import { useGetBlogPostQuery } from "@/store/api/postBlogApi";
import { blogPost } from "../lib/posts";

/**
 * Opens the composer on a blog post when the screen is reached from the
 * "GBP Posting" link in Posts → All Posts (`#/posts?share=<post id>`).
 *
 * Waits for the location's Google listing, since a post is written for it.
 * The `share` parameter is then removed, so reloading the screen does not
 * open the composer again.
 *
 * @param {Object}   props
 * @param {boolean}  props.ready     Whether the location's listing is known.
 * @param {Function} props.onCompose Open the composer on a post.
 */
export function useBlogShare({ ready, onCompose }) {
  const [params, setParams] = useSearchParams();
  const shareId = Number(params.get("share")) || 0;
  const premium = hasPro("posts.blog");
  // currentData, not data: data keeps the last link's blog post while the
  // next one loads, which would open the wrong post.
  const { currentData, error, isFetching } = useGetBlogPostQuery(shareId, {
    skip: !shareId || !premium,
  });
  const data = currentData?.id === shareId ? currentData : null;

  useEffect(() => {
    if (!shareId || !ready || (premium && (isFetching || (!data && !error)))) {
      return;
    }

    const clear = () =>
      setParams(
        (current) => {
          current.delete("share");

          return current;
        },
        { replace: true },
      );

    if (!premium) {
      toast.error(
        __(
          "Sharing your blog is part of FoundHint Premium.",
          "foundhint-local-seo",
        ),
      );
    } else if (error) {
      toast.error(errorMessage(error));
    } else {
      onCompose(blogPost(data));

      if (!data.image_reachable) {
        toast.info(
          __(
            "Google cannot fetch the blog post's featured image from this site, so it was left off. Add a photo in the post if you want one.",
            "foundhint-local-seo",
          ),
        );
      }
    }

    clear();
  }, [shareId, ready, premium, data, error, isFetching, onCompose, setParams]);
}

export default useBlogShare;
