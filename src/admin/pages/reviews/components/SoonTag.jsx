import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { tag } from "@/pages/profile/styles";

/**
 * "Pro" or "Coming soon", beside a control that is not in this version.
 * Said in words, not by greying alone, so it reads the same to everyone.
 *
 * Pro is a pill on the accent's light tint with an orange edge,
 * so it reads as an upgrade rather than a warning. The text keeps the
 * notice colour: white on the accent itself is too faint at this size.
 * "Coming soon" stays the quiet outlined tag.
 *
 * @param {Object} props
 * @param {"pro"|"soon"} props.kind Which to say.
 */
export function SoonTag({ kind = "soon", className }) {
  if (kind === "pro") {
    return (
      <span
        className={cn(
          "fhint:inline-flex fhint:items-center fhint:rounded-full fhint:border fhint:border-primary/40 fhint:bg-linear-to-r fhint:from-notice fhint:to-card fhint:px-2 fhint:py-[3px] fhint:text-[10px] fhint:leading-none fhint:font-extrabold fhint:tracking-[0.08em] fhint:whitespace-nowrap fhint:text-notice-foreground fhint:uppercase fhint:shadow-[0_1px_2px_rgb(255_107_53/0.18)]",
          className,
        )}
      >
        {__("Premium", "foundhint-local-seo")}
      </span>
    );
  }

  return (
    <span
      className={cn(
        tag,
        "fhint:rounded-full fhint:border fhint:border-notice-border fhint:bg-card fhint:whitespace-nowrap fhint:text-notice-foreground",
        className,
      )}
    >
      {__("Coming soon", "foundhint-local-seo")}
    </span>
  );
}

export default SoonTag;
