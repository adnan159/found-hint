import { __, sprintf } from "@wordpress/i18n";
import { cn } from "cn";
import { muted } from "../../styles";

/**
 * No services: where to add them — the profile when locked, here otherwise,
 * or the business's own list for a branch with none.
 */
export function EmptyList({ locked, list, branchName }) {
  return (
    <p className={cn(muted, "fhint:m-0 fhint:px-5 fhint:py-5")}>
      {locked
        ? __(
            "No services yet. Add them on your Business Profile screen.",
            "foundhint-local-seo",
          )
        : list
          ? sprintf(
              /* translators: %s: branch name. */
              __(
                "%s has no services of its own yet. Add one here, or choose your main location at the top to see your business's services.",
                "foundhint-local-seo",
              ),
              branchName || __("This branch", "foundhint-local-seo"),
            )
          : __("No services yet. Add the first one.", "foundhint-local-seo")}
    </p>
  );
}

export default EmptyList;
