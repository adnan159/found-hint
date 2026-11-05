import { useId } from "react";
import { __, _n, sprintf } from "@wordpress/i18n";
import { RssIcon } from "lucide-react";
import { toast } from "sonner";
import Panel from "@/components/Panel";
import { Switch } from "@/components/ui/switch";
import { errorMessage } from "@/lib/errors";
import { hasPro } from "@/lib/pro";
import SoonTag from "@/pages/reviews/components/SoonTag";
import {
  useGetBlogSharingQuery,
  useSetBlogSharingMutation,
} from "@/store/api/postBlogApi";

/**
 * "Share your blog on Google" — FoundHint Premium (`posts.blog`). A switch:
 * on, each published blog post in Posts → All Posts gets a "GBP Posting"
 * link that opens a new post here, written from it. Without Premium the
 * switch is drawn off and disabled, with its PRO tag.
 *
 * @param {Object} props
 * @param {number} props.blogPosts Published posts on the WordPress site.
 */
export function BlogCard({ blogPosts }) {
  const id = useId();
  const premium = hasPro("posts.blog");
  const { data: enabled = false, isLoading } = useGetBlogSharingQuery(
    undefined,
    { skip: !premium },
  );
  const [save, { isLoading: saving }] = useSetBlogSharingMutation();

  const toggle = async (next) => {
    try {
      await save({ enabled: next }).unwrap();
      toast.success(
        next
          ? __(
              "Blog sharing is on. Find “GBP Posting” under each published post in Posts → All Posts.",
              "foundhint-local-seo",
            )
          : __("Blog sharing is off.", "foundhint-local-seo"),
      );
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const on = premium && enabled;

  return (
    <Panel
      icon={RssIcon}
      title={__("Share your blog on Google", "foundhint-local-seo")}
      after={premium ? null : <SoonTag kind="pro" />}
      description={
        on
          ? __(
              "On: open Posts → All Posts and choose “GBP Posting” under a published post to share it here.",
              "foundhint-local-seo",
            )
          : __(
              "Turn your WordPress blog posts into Google Business Profile updates.",
              "foundhint-local-seo",
            )
      }
      actions={
        <>
          <span className="fhint:text-sm fhint:font-semibold fhint:text-muted-strong">
            {sprintf(
              /* translators: %d: number of published blog posts. */
              _n(
                "%d published post on your site",
                "%d published posts on your site",
                blogPosts,
                "foundhint-local-seo",
              ),
              blogPosts,
            )}
          </span>
          <span className="fhint:inline-flex fhint:items-center fhint:gap-2">
            <Switch
              aria-labelledby={id}
              checked={on}
              disabled={!premium || isLoading || saving}
              onCheckedChange={toggle}
              title={
                premium
                  ? undefined
                  : __(
                      "Sharing your blog is part of FoundHint Premium.",
                      "foundhint-local-seo",
                    )
              }
            />
            <span
              id={id}
              className="fhint:text-sm fhint:font-semibold"
              aria-live="polite"
            >
              {on
                ? __("Sharing on", "foundhint-local-seo")
                : __("Sharing off", "foundhint-local-seo")}
            </span>
          </span>
        </>
      }
    />
  );
}

export default BlogCard;
