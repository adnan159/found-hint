import { __ } from "@wordpress/i18n";
import { ImageIcon } from "lucide-react";
import { cn } from "cn";
import { chooseImages, hasMediaLibrary } from "../../lib/media";
import { chip, linkAction, muted } from "../styles";

/**
 * The logo, chosen from the Media Library — printed as an ImageObject with
 * its size, served from this site (QA D1). Read-only: the image itself.
 */
export function LogoPicker({ id, value, readOnly, onChange, describedBy }) {
  const pick = async () => {
    const [image] = await chooseImages({
      title: __("Choose your logo", "foundhint-local-seo"),
      button: __("Use as logo", "foundhint-local-seo"),
    });

    if (image?.url) {
      onChange(image.url);
    }
  };

  return (
    <div
      id={id}
      role="group"
      aria-describedby={describedBy}
      className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3"
    >
      <span className="fhint:flex fhint:size-16 fhint:shrink-0 fhint:items-center fhint:justify-center fhint:border fhint:border-border fhint:bg-background">
        {value ? (
          <img
            src={value}
            alt={__("Current logo", "foundhint-local-seo")}
            className="fhint:max-h-full fhint:max-w-full fhint:object-contain"
          />
        ) : (
          <ImageIcon
            aria-hidden="true"
            className="fhint:size-6 fhint:text-muted-strong"
          />
        )}
      </span>

      {readOnly ? (
        value ? null : (
          <span className={muted}>
            {__("No logo yet.", "foundhint-local-seo")}
          </span>
        )
      ) : (
        <span className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3">
          <button
            type="button"
            onClick={pick}
            disabled={!hasMediaLibrary()}
            className={cn(chip(false), "fhint:disabled:opacity-50")}
          >
            {value
              ? __("Replace logo", "foundhint-local-seo")
              : __("Choose from Media Library", "foundhint-local-seo")}
          </button>
          {value ? (
            <button
              type="button"
              onClick={() => onChange("")}
              className={linkAction}
            >
              {__("Remove", "foundhint-local-seo")}
            </button>
          ) : null}
        </span>
      )}
    </div>
  );
}

export default LogoPicker;
