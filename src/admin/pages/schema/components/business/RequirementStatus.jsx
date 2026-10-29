import { __, sprintf } from "@wordpress/i18n";
import { cn } from "cn";
import { fieldLabel } from "../../lib/schema";

/**
 * Whether the business has the details Google needs for a local business
 * result — Google's required properties only; it never claims the markup
 * is valid or will show (doc §5.3, §11.3).
 */
export function RequirementStatus({ kind, visitMode, missing }) {
  const ok = !missing.length;
  const names = missing.map(fieldLabel).join(", ");

  let title;
  let body;

  if (kind === "organization") {
    title = ok
      ? __("Ready to publish.", "foundhint-local-seo")
      : __("Can't publish yet.", "foundhint-local-seo");
    body = ok
      ? __(
          "Organization schema doesn't need an address or opening hours.",
          "foundhint-local-seo",
        )
      : sprintf(
          /* translators: %s: the fields that are missing. */
          __("FoundHint needs: %s.", "foundhint-local-seo"),
          names,
        );
  } else if (ok) {
    title = __(
      "Has the details Google needs for a local business result.",
      "foundhint-local-seo",
    );
    body =
      visitMode === "service_area"
        ? __(
            "Service-area businesses publish their areas instead of a street address. Green badges improve how you show.",
            "foundhint-local-seo",
          )
        : __(
            "Business name and physical address are in place. Green badges improve how you show.",
            "foundhint-local-seo",
          );
  } else {
    title = __("Can't publish yet.", "foundhint-local-seo");
    body = sprintf(
      /* translators: %s: the fields that are missing. */
      __(
        "Google needs: %s. Everything else is optional. Until then this is saved as a draft and nothing is printed.",
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
          ? "fhint:border-[#cfe3d6] fhint:bg-[#eef6f1]"
          : "fhint:border-[#f1dcb6] fhint:bg-[#FBF0DE]",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "fhint:mt-1.5 fhint:size-2 fhint:flex-none fhint:rounded-full",
          ok ? "fhint:bg-[#157F4B]" : "fhint:bg-[#E0A33A]",
        )}
      />
      <span className="fhint:text-[13px] fhint:leading-normal">
        <strong>{title}</strong> {body}
      </span>
    </div>
  );
}

export default RequirementStatus;
