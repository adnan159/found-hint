import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { label, quietButton, tag, tagTones } from "../../styles";
import { STATES, thumb } from "./lib";
import Picker from "./Picker";

/**
 * One of the listing's two named photos — the logo or the cover — showing
 * the one waiting to be sent if there is one, and otherwise the one Google
 * has.
 */
export function PhotoSlot({
  title,
  shape,
  photo,
  waiting,
  wide,
  disabled,
  onFiles,
}) {
  const shown = waiting ?? photo;

  return (
    <div className="fhint:grid fhint:content-start fhint:gap-2">
      <span className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2">
        <span className={label}>{title}</span>
        <span className={cn(tag, tagTones.quiet)}>{shape}</span>
        {waiting ? (
          <span
            className={cn(tag, STATES[waiting.state]?.tone ?? tagTones.accent)}
          >
            {STATES[waiting.state]?.label() ?? waiting.state}
          </span>
        ) : photo ? (
          <span className={cn(tag, tagTones.ok)}>
            {__("On Google", "foundhint-local-seo")}
          </span>
        ) : null}
      </span>
      <div
        className={cn(
          "fhint:grid fhint:place-items-center fhint:overflow-hidden fhint:border fhint:bg-muted fhint:text-[12.5px] fhint:text-muted-foreground",
          wide
            ? "fhint:aspect-video"
            : "fhint:aspect-square fhint:max-w-[180px]",
          shown?.url
            ? "fhint:border-border"
            : "fhint:border-dashed fhint:border-input",
        )}
      >
        {shown?.url ? (
          <img
            src={thumb(shown.url, 640)}
            alt={title}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="fhint:size-full fhint:object-cover"
          />
        ) : (
          __("Not set", "foundhint-local-seo")
        )}
      </div>
      <span>
        <Picker disabled={disabled} onFiles={onFiles} className={quietButton}>
          {shown
            ? __("Choose another", "foundhint-local-seo")
            : __("Choose photo", "foundhint-local-seo")}
        </Picker>
      </span>
    </div>
  );
}

export default PhotoSlot;
