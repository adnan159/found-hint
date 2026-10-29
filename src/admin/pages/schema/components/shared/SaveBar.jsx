import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { primaryAction } from "../styles";

/**
 * The footer of every tab — the profile section's footer: where things
 * stand, and Save and publish.
 */
export function SaveBar({ dirty, saving, status, live, onSave }) {
  const line = saving
    ? __("Saving…", "foundhint-local-seo")
    : dirty
      ? __("You have unsaved changes.", "foundhint-local-seo")
      : status === "draft"
        ? __(
            "Saved as a draft. Nothing is printed until the details Google needs are filled in.",
            "foundhint-local-seo",
          )
        : live
          ? __("Saved and live on your site.", "foundhint-local-seo")
          : __(
              "Saved. Your site keeps its current markup until FoundHint Pro's full schema output is switched on.",
              "foundhint-local-seo",
            );

  // In words as well as colour, as the profile's section footer says it.
  const tone = saving
    ? "fhint:text-muted-strong"
    : dirty
      ? "fhint:text-foreground"
      : status !== "draft" && live
        ? "fhint:text-success"
        : "fhint:text-muted-strong";

  return (
    <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3 fhint:border-t fhint:border-t-border fhint:px-[22px] fhint:py-3.5">
      <span
        role="status"
        aria-live="polite"
        className={cn(
          "fhint:min-w-0 fhint:flex-[1_1_220px] fhint:text-[13px] fhint:font-bold",
          tone,
        )}
      >
        {line}
      </span>
      <button
        type="button"
        onClick={onSave}
        disabled={!dirty || saving}
        className={primaryAction}
      >
        {__("Save and publish", "foundhint-local-seo")}
      </button>
    </div>
  );
}

export default SaveBar;
