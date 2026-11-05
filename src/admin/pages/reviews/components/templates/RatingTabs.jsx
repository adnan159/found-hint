import { __, sprintf } from "@wordpress/i18n";
import { StarIcon } from "lucide-react";
import { cn } from "cn";
import { focus } from "@/pages/profile/styles";

/**
 * The template card's star tabs: All, then 1 to 5 stars — one row at any
 * width, the chosen one underlined in the accent.
 *
 * @param {Object}          props
 * @param {"all"|number}    props.rating   The chosen tab.
 * @param {Function}        props.onChange Receives "all" or 1–5.
 */
export function RatingTabs({ rating, onChange }) {
  return (
    <div
      role="tablist"
      aria-label={__("Star rating", "foundhint-local-seo")}
      className="fhint:grid fhint:grid-cols-6 fhint:border-b fhint:border-b-border"
    >
      {["all", 1, 2, 3, 4, 5].map((stars) => (
        <button
          key={stars}
          type="button"
          role="tab"
          aria-selected={rating === stars}
          aria-label={
            stars === "all"
              ? __("All ratings", "foundhint-local-seo")
              : sprintf(
                  /* translators: %d: a star rating from 1 to 5. */
                  __("%d stars", "foundhint-local-seo"),
                  stars,
                )
          }
          onClick={() => onChange(stars)}
          className={cn(
            "fhint:-mb-px fhint:inline-flex fhint:min-w-0 fhint:cursor-pointer fhint:items-center fhint:justify-center fhint:gap-1 fhint:border-0 fhint:border-b-2 fhint:bg-transparent fhint:px-1 fhint:pt-1 fhint:pb-2 fhint:text-sm fhint:leading-none fhint:font-extrabold fhint:whitespace-nowrap fhint:transition-colors",
            rating === stars
              ? "fhint:border-b-primary fhint:text-foreground"
              : "fhint:border-b-transparent fhint:text-muted-strong fhint:hover:border-b-border fhint:hover:text-foreground",
            focus,
          )}
        >
          {stars === "all" ? (
            __("All", "foundhint-local-seo")
          ) : (
            <>
              {stars}
              <StarIcon
                aria-hidden="true"
                className="fhint:size-3 fhint:flex-none fhint:fill-star fhint:text-star"
              />
            </>
          )}
        </button>
      ))}
    </div>
  );
}

export default RatingTabs;
