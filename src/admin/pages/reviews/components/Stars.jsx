import { __, _n, sprintf } from "@wordpress/i18n";
import { cn } from "cn";
import { StarIcon } from "lucide-react";

/**
 * A star rating, drawn and said: five Lucide stars, the rating's worth
 * filled in the star colour and the rest in grey — the same star the reply
 * templates use. The stars are decoration; the words beside them, for
 * screen readers, are the rating.
 */
export function Stars({ value }) {
  const rating = Number(value) || 0;

  if (!rating) {
    return (
      <span className="fhint:text-sm fhint:text-muted-strong">
        {__("No rating", "foundhint-local-seo")}
      </span>
    );
  }

  return (
    <span className="fhint:inline-flex fhint:items-center fhint:gap-0.5">
      {Array.from({ length: 5 }, (_, index) => (
        <StarIcon
          key={index}
          aria-hidden="true"
          className={cn(
            "fhint:size-3 fhint:flex-none",
            index < rating
              ? "fhint:fill-star fhint:text-star"
              : "fhint:fill-[#D9D3D0] fhint:text-[#D9D3D0]",
          )}
        />
      ))}
      <span className="fhint:sr-only">
        {sprintf(
          /* translators: %d: a star rating from 1 to 5. */
          _n("%d star", "%d stars", rating, "foundhint-local-seo"),
          rating,
        )}
      </span>
    </span>
  );
}

export default Stars;
