import { __, _n, sprintf } from "@wordpress/i18n";
import { RssIcon } from "lucide-react";
import Panel from "@/components/Panel";
import { dialogButton } from "@/pages/schema/components/styles";
import SoonTag from "@/pages/reviews/components/SoonTag";

/**
 * "Share your blog on Google" — FoundHint Pro. Drawn so the owner knows it
 * exists; the button does nothing in the free plugin. A heading row alone:
 * what it does under the title, the site's post count and the button on
 * the right.
 *
 * @param {Object} props
 * @param {number} props.blogPosts Published posts on the WordPress site.
 */
export function BlogCard({ blogPosts }) {
  return (
    <Panel
      icon={RssIcon}
      title={__("Share your blog on Google", "foundhint-local-seo")}
      after={<SoonTag kind="pro" />}
      description={__(
        "Turn your WordPress blog posts into Google Business Profile updates.",
        "foundhint-local-seo",
      )}
      actions={
        <>
          <span className="fhint:text-[12.5px] fhint:font-semibold fhint:text-muted-strong">
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
          <button
            type="button"
            disabled
            title={__(
              "Sharing your blog is part of FoundHint Pro.",
              "foundhint-local-seo",
            )}
            className={dialogButton}
          >
            <RssIcon aria-hidden="true" className="fhint:size-3.5" />
            {__("Share Website Blog", "foundhint-local-seo")}
          </button>
        </>
      }
    />
  );
}

export default BlogCard;
