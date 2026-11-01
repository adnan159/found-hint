import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { MessageSquareQuoteIcon } from "lucide-react";
import { useNavigate } from "react-router";
import Panel from "@/components/Panel";
import { help, linkButton } from "@/pages/profile/styles";
import { primaryAction } from "@/pages/schema/components/styles";
import Stars from "@/pages/reviews/components/Stars";
import { formatDate } from "@/pages/reviews/lib/replies";

/**
 * The latest 5-star reviews with words, each one click from an update
 * thanking its author. Drawn as a Business Profile section, the reviews in
 * tinted boxes with no edge of their own.
 *
 * @param {Object}        props
 * @param {Array<Object>} props.reviews    Recent 5-star reviews with a comment.
 * @param {Function}      props.onMakePost Receives the review to post.
 */
export function ReviewsCard({ reviews, onMakePost }) {
  const navigate = useNavigate();

  return (
    <Panel
      icon={MessageSquareQuoteIcon}
      title={__("Turn reviews into posts", "foundhint-local-seo")}
      description={__(
        "Share your customers' 5-star reviews as a post in one click.",
        "foundhint-local-seo",
      )}
      actions={
        <button
          type="button"
          onClick={() => navigate("/reviews")}
          className={linkButton}
        >
          {__("See all 5-star reviews", "foundhint-local-seo")}
        </button>
      }
    >
      {reviews.length ? (
        <ul className="fhint:m-0 fhint:grid fhint:list-none fhint:gap-3 fhint:p-0 fhint:md:grid-cols-2">
          {reviews.map((review) => (
            <li
              key={review.review_id}
              className="fhint:m-0 fhint:flex fhint:items-start fhint:gap-3 fhint:bg-[#faf6f4] fhint:px-3.5 fhint:py-3"
            >
              <div className="fhint:grid fhint:min-w-0 fhint:flex-1 fhint:gap-1.5">
                <Stars value={5} />
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
                className={cn(primaryAction, "fhint:flex-none")}
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
    </Panel>
  );
}

export default ReviewsCard;
