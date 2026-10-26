import { __, _n, sprintf } from "@wordpress/i18n";

/**
 * A star rating, drawn and said. The stars are decoration; the words
 * beside them, for screen readers, are the rating.
 */
export function Stars({ value }) {
  const rating = Number(value) || 0;

  if (!rating) {
    return (
      <span className="fhint:text-[12.5px] fhint:text-muted-strong">
        {__("No rating", "foundhint-local-seo")}
      </span>
    );
  }

  return (
    <span className="fhint:inline-flex fhint:items-center">
      <span
        aria-hidden="true"
        className="fhint:text-[13px] fhint:tracking-[1px]"
      >
        <span className="fhint:text-[#C27A1B]">{"★".repeat(rating)}</span>
        <span className="fhint:text-[#D9D3D0]">{"★".repeat(5 - rating)}</span>
      </span>
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
