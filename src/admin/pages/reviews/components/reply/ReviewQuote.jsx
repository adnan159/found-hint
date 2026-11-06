import { __ } from "@wordpress/i18n";
import { formatDate } from "../../lib/replies";
import Stars from "../Stars";

/**
 * The review being answered, quoted at the top of the reply dialog: who,
 * how many stars, when, and what they wrote.
 *
 * @param {Object} props
 * @param {Object} props.review The review.
 * @param {number} props.rating Its stars.
 */
export function ReviewQuote({ review, rating }) {
  return (
    <blockquote className="fhint:m-0 fhint:grid fhint:gap-1.5 fhint:border fhint:border-border fhint:bg-[#faf6f4] fhint:px-3.5 fhint:py-3">
      <span className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2 fhint:text-sm">
        <strong>
          {review.is_anonymous || !review.reviewer_name
            ? __("Anonymous", "foundhint-local-seo")
            : review.reviewer_name}
        </strong>
        <Stars value={rating} />
        {review.reviewed_at ? (
          <span className="fhint:text-[12px] fhint:text-muted-strong">
            {formatDate(review.reviewed_at)}
          </span>
        ) : null}
      </span>
      <span className="fhint:text-sm fhint:leading-relaxed">
        {review.comment ||
          __("Left a star rating without a comment.", "foundhint-local-seo")}
      </span>
    </blockquote>
  );
}

export default ReviewQuote;
