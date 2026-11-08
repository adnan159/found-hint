import { __, sprintf } from "@wordpress/i18n";
import { cn } from "cn";
import { fieldLabel } from "../../lib/schema";

/**
 * Whether the business has the details Google needs for a local business
 * result — Google's required properties only; it never claims the markup
 * is valid or will show (doc §5.3, §11.3).
 *
 * Shown above the JSON preview, so `className` drops the card's own
 * margin there.
 */
export function RequirementStatus({ kind, visitMode, missing, className }) {
  const ok = !missing.length;
  const names = missing.map(fieldLabel).join(", ");

  let title;
  let body;

  if (kind === "organization") {
    title = ok
      ? __("Ready to publish.", "foundhint-local-seo")
      : __("Can't publish yet.", "foundhint-local-seo");
    body = ok
      ? __("No address or hours needed.", "foundhint-local-seo")
      : sprintf(
          /* translators: %s: the fields that are missing. */
          __("Needs: %s.", "foundhint-local-seo"),
          names,
        );
  } else if (ok) {
    title = __("Ready to publish.", "foundhint-local-seo");
    body =
      visitMode === "service_area"
        ? __(
            "Your service areas stand in for an address.",
            "foundhint-local-seo",
          )
        : __("Name and address are in place.", "foundhint-local-seo");
  } else {
    title = __("Can't publish yet.", "foundhint-local-seo");
    body = sprintf(
      /* translators: %s: the fields that are missing. */
      __(
        "Google needs: %s. Saved as a draft until then.",
        "foundhint-local-seo",
      ),
      names,
    );
  }

  return (
    <div
      role="status"
      className={cn(
        "fhint:mx-5 fhint:my-4 fhint:flex fhint:items-start fhint:gap-2.5 fhint:border fhint:px-3.5 fhint:py-3",
        ok
          ? "fhint:border-border fhint:bg-success-tint"
          : "fhint:border-warning-border fhint:bg-warning",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "fhint:mt-1.5 fhint:size-2 fhint:flex-none fhint:rounded-full",
          ok ? "fhint:bg-success" : "fhint:bg-warning-foreground",
        )}
      />
      <span className="fhint:text-sm fhint:leading-normal">
        <strong>{title}</strong> {body}
      </span>
    </div>
  );
}

export default RequirementStatus;
