import { __, _n, sprintf } from "@wordpress/i18n";
import { RssIcon, StarIcon } from "lucide-react";
import { useNavigate } from "react-router";
import { cn } from "cn";
import {
  help,
  linkButton,
  primaryButton,
  quietButton,
} from "@/pages/profile/styles";
import SoonTag from "@/pages/reviews/components/SoonTag";
import { formatDate } from "@/pages/reviews/lib/replies";

const card =
  "fhint:border fhint:border-border fhint:bg-card fhint:px-4 fhint:py-3.5";

/**
 * "Share your blog on Google" — FoundHint Pro. Drawn so the owner knows it
 * exists; the button does nothing in the free plugin.
 */
export function BlogCard({ blogPosts }) {
  return (
    <section
      aria-labelledby="fhint-posts-blog"
      className={cn(
        card,
        "fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3",
      )}
    >
      <span
        aria-hidden="true"
        className="fhint:grid fhint:size-9 fhint:flex-none fhint:place-items-center fhint:bg-[#eaeef6] fhint:text-[#33558f]"
      >
        <RssIcon className="fhint:size-4" />
      </span>
      <div className="fhint:grid fhint:min-w-0 fhint:flex-1 fhint:gap-0.5">
        <h2
          id="fhint-posts-blog"
          className="fhint:m-0 fhint:flex fhint:items-center fhint:gap-2 fhint:text-[14px] fhint:font-extrabold"
        >
          {__("Share your blog on Google", "foundhint-local-seo")}
          <SoonTag kind="pro" />
        </h2>
        <span className={help}>
          {__(
            "Turn your WordPress blog posts into Google Business Profile updates.",
            "foundhint-local-seo",
          )}
        </span>
      </div>
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
        className={quietButton}
      >
        <RssIcon aria-hidden="true" className="fhint:size-3.5" />
        {__("Share Website Blog", "foundhint-local-seo")}
      </button>
    </section>
  );
}

/**
 * The latest 5-star reviews with words, each one click from an update
 * thanking its author.
 */
export function ReviewsCard({ reviews, onMakePost }) {
  const navigate = useNavigate();

  return (
    <section
      aria-labelledby="fhint-posts-reviews"
      className={cn(card, "fhint:grid fhint:gap-3")}
    >
      <div className="fhint:grid fhint:gap-0.5">
        <h2
          id="fhint-posts-reviews"
          className="fhint:m-0 fhint:text-[14px] fhint:font-extrabold"
        >
          {__("Turn reviews into posts", "foundhint-local-seo")}
        </h2>
        <span className={help}>
          {__(
            "Share your customers' 5-star reviews as a post in one click.",
            "foundhint-local-seo",
          )}
        </span>
      </div>

      {reviews.length ? (
        <ul className="fhint:m-0 fhint:grid fhint:list-none fhint:gap-2 fhint:p-0 fhint:md:grid-cols-2">
          {reviews.map((review) => (
            <li
              key={review.review_id}
              className="fhint:m-0 fhint:flex fhint:items-start fhint:gap-3 fhint:border fhint:border-border fhint:bg-[#faf6f4] fhint:px-3 fhint:py-2.5"
            >
              <div className="fhint:grid fhint:min-w-0 fhint:flex-1 fhint:gap-1">
                <span
                  role="img"
                  aria-label={__("5 out of 5 stars", "foundhint-local-seo")}
                  className="fhint:flex fhint:gap-0.5 fhint:text-[#e7a33e]"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <StarIcon
                      key={n}
                      aria-hidden="true"
                      className="fhint:size-3 fhint:fill-current"
                    />
                  ))}
                </span>
                <q className="fhint:line-clamp-2 fhint:text-[13px] fhint:font-semibold">
                  {review.comment}
                </q>
                <span className="fhint:text-[12px] fhint:text-muted-strong">
                  {[review.reviewer_name, formatDate(review.reviewed_at)]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onMakePost(review)}
                className={cn(
                  primaryButton,
                  "fhint:flex-none fhint:px-2.5 fhint:py-1.5",
                )}
              >
                {__("Make a post", "foundhint-local-seo")}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={cn(help, "fhint:m-0")}>
          {__(
            "Your 5-star reviews with a comment appear here. Sync reviews on the Reviews screen to check for new ones.",
            "foundhint-local-seo",
          )}
        </p>
      )}

      <button
        type="button"
        onClick={() => navigate("/reviews")}
        className={cn(linkButton, "fhint:justify-self-start")}
      >
        {__("See all 5-star reviews", "foundhint-local-seo")}
      </button>
    </section>
  );
}
