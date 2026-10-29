import { __, sprintf } from "@wordpress/i18n";
import { ImageIcon, UploadIcon } from "lucide-react";
import { cn } from "cn";
import { label, quietButton, tag, tagTones } from "../../styles";
import { STATES, thumb } from "./lib";
import Picker from "./Picker";

/**
 * One of the listing's two named photos — the logo or the cover — as a
 * card: its name and shape, then a drop zone.
 *
 * Empty, the zone says what goes there and opens the file picker, or takes
 * a dropped file. With a photo — the one waiting to be sent if there is
 * one, otherwise the one Google has — the zone shows it, and an "Upload
 * another" button replaces it.
 */
export function PhotoSlot({
  title,
  shape,
  placeholder,
  photo,
  waiting,
  wide,
  disabled,
  onFiles,
}) {
  const shown = waiting ?? photo;
  const status = waiting
    ? {
        tone: STATES[waiting.state]?.tone ?? tagTones.accent,
        label: STATES[waiting.state]?.label() ?? waiting.state,
      }
    : photo
      ? { tone: tagTones.ok, label: __("On Google", "foundhint-local-seo") }
      : null;

  // The zone's own shape: the logo a square in the middle of a tinted
  // panel, the cover the full width.
  const zone = cn(
    "fhint:grid fhint:cursor-pointer fhint:place-items-center fhint:overflow-hidden fhint:rounded-[3px] fhint:border fhint:text-center fhint:transition-colors",
    wide ? "fhint:h-[150px] fhint:w-full" : "fhint:size-[130px]",
    shown?.url
      ? "fhint:border-border fhint:bg-card"
      : "fhint:border-dashed fhint:border-input fhint:bg-muted fhint:hover:bg-accent",
  );

  return (
    <div className="fhint:grid fhint:content-start fhint:gap-3 fhint:rounded-[12px] fhint:border fhint:border-border fhint:bg-card fhint:p-4">
      <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2">
        <span className={cn(label, "fhint:text-sm")}>{title}</span>
        <span className="fhint:text-[12.5px] fhint:text-muted-strong">
          {shape}
        </span>
        {status ? (
          <span className={cn(tag, status.tone, "fhint:ml-auto")}>
            {status.label}
          </span>
        ) : null}
      </div>

      <div
        className={cn(
          "fhint:grid fhint:place-items-center fhint:rounded-[10px]",
          wide ? "" : "fhint:bg-muted fhint:py-[10px]",
        )}
      >
        <Picker
          droppable
          disabled={disabled}
          onFiles={onFiles}
          className={zone}
          draggingClassName="fhint:border-primary fhint:bg-primary/10"
          label={sprintf(
            /* translators: %s: "Logo" or "Cover photo". */
            __("Choose a file for your %s", "foundhint-local-seo"),
            title.toLowerCase(),
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
            <span className="fhint:grid fhint:justify-items-center fhint:gap-1.5 fhint:px-2">
              <ImageIcon
                aria-hidden="true"
                className="fhint:size-6 fhint:text-muted-strong"
                strokeWidth={1.5}
              />
              <span className="fhint:text-[13.5px] fhint:font-semibold fhint:text-foreground-soft">
                {placeholder}
              </span>
              <span className="fhint:text-[11.5px] fhint:text-muted-strong">
                {__("or", "foundhint-local-seo")}{" "}
                <span className="fhint:underline">
                  {__("browse files", "foundhint-local-seo")}
                </span>
              </span>
            </span>
          )}
        </Picker>
      </div>

      {shown ? (
        <span>
          <Picker disabled={disabled} onFiles={onFiles} className={quietButton}>
            <UploadIcon aria-hidden="true" className="fhint:size-3.5" />
            {__("Upload another", "foundhint-local-seo")}
          </Picker>
        </span>
      ) : null}
    </div>
  );
}

export default PhotoSlot;
