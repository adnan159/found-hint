import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { tag } from "@/pages/profile/styles";

/**
 * "Pro" or "Coming soon", beside a control that is not in this version.
 * Said in words, not by greying alone, so it reads the same to everyone.
 *
 * @param {Object} props
 * @param {"pro"|"soon"} props.kind Which to say.
 */
export function SoonTag({ kind = "soon", className }) {
  return (
    <span
      className={cn(
        tag,
        "fhint:rounded-full fhint:border fhint:border-notice-border fhint:bg-card fhint:whitespace-nowrap fhint:text-notice-foreground",
        className,
      )}
    >
      {kind === "pro"
        ? __("Pro", "foundhint-local-seo")
        : __("Coming soon", "foundhint-local-seo")}
    </span>
  );
}

export default SoonTag;
