import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { primary } from "./styles";

/**
 * The footer of every tab: where things stand, and Save and publish.
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

  return (
    <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3 fhint:border-t fhint:border-t-[#e6e3e3] fhint:bg-[#faf9f9] fhint:px-5 fhint:py-3.5">
      <span
        aria-hidden="true"
        className={cn(
          "fhint:size-2 fhint:rounded-full",
          dirty
            ? "fhint:bg-[#E0A33A]"
            : status === "draft" || !live
              ? "fhint:bg-[#bab6b6]"
              : "fhint:bg-[#3BC27A]",
        )}
      />
      <span
        role="status"
        aria-live="polite"
        className={cn(
          "fhint:flex-[1_1_220px] fhint:text-[13px]",
          dirty && "fhint:text-[#8a5a00]",
        )}
      >
        {line}
      </span>
      <button
        type="button"
        onClick={onSave}
        disabled={!dirty || saving}
        className={primary(dirty && !saving)}
      >
        {__("Save and publish", "foundhint-local-seo")}
      </button>
    </div>
  );
}

export default SaveBar;
