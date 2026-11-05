import { __, _n, sprintf } from "@wordpress/i18n";
import { cn } from "cn";
import { help } from "@/pages/profile/styles";

/**
 * How many templates the chosen tab holds, announced as it changes.
 *
 * @param {Object}       props
 * @param {boolean}      props.loading Premium's templates are loading.
 * @param {"all"|number} props.rating  The chosen tab.
 * @param {number}       props.count   Templates shown.
 */
export function TemplateCount({ loading, rating, count }) {
  return (
    <p aria-live="polite" className={cn(help, "fhint:m-0")}>
      {loading
        ? __("Loading your templates…", "foundhint-local-seo")
        : rating === "all"
          ? sprintf(
              /* translators: %d: number of reply templates. */
              _n(
                "All ratings have %d template.",
                "All ratings have %d templates.",
                count,
                "foundhint-local-seo",
              ),
              count,
            )
          : sprintf(
              /* translators: 1: a star rating from 1 to 5, 2: number of reply templates. */
              _n(
                "%1$d-star reviews have %2$d template.",
                "%1$d-star reviews have %2$d templates.",
                count,
                "foundhint-local-seo",
              ),
              rating,
              count,
            )}
    </p>
  );
}

export default TemplateCount;
