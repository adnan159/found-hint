import { useState } from "react";
import { __ } from "@wordpress/i18n";
import { XIcon } from "lucide-react";
import { cn } from "cn";
import { focus, help, label } from "@/pages/profile/styles";
import usePhotoChoice from "../hooks/usePhotoChoice";
import GooglePhotoPicker from "./photo/GooglePhotoPicker";
import PhotoChooser from "./photo/PhotoChooser";
import PhotoNotes from "./photo/PhotoNotes";

/**
 * The photo on a post: what is chosen, and the ways to choose one — the
 * Media Library, a dropped file, or a photo already on the listing's
 * Google gallery.
 *
 * Google fetches a post's photo from its link. A photo on this site works
 * only when the site is public; otherwise it goes on the listing's Google
 * gallery first, and that is said as soon as it matters.
 */
export function PhotoField({
  value,
  reachable,
  mediaCount,
  locationName,
  uploadsReachable = true,
  error,
  onChange,
}) {
  const [picking, setPicking] = useState(false);
  const choice = usePhotoChoice(locationName, onChange);

  return (
    <div className="fhint:grid fhint:gap-2">
      <span className="fhint:flex fhint:flex-wrap fhint:items-baseline fhint:gap-2">
        <span className={label}>{__("Photo", "foundhint-local-seo")}</span>
        <span className={help}>
          {__(
            "Recommended. Posts with a photo get more clicks.",
            "foundhint-local-seo",
          )}
        </span>
      </span>

      <div className="fhint:flex fhint:items-stretch fhint:gap-3">
        {value ? (
          <div className="fhint:relative fhint:w-32 fhint:flex-none">
            <img
              src={value}
              alt={__("The chosen photo", "foundhint-local-seo")}
              referrerPolicy="no-referrer"
              className="fhint:size-full fhint:min-h-20 fhint:rounded-[12px] fhint:border fhint:border-border fhint:object-cover"
            />
            <button
              type="button"
              onClick={() =>
                onChange({ media_url: "", attachment_id: 0, reachable: true })
              }
              className={cn(
                "fhint:absolute fhint:-top-2 fhint:-right-2 fhint:grid fhint:size-6 fhint:cursor-pointer fhint:place-items-center fhint:rounded-full fhint:border fhint:border-border fhint:bg-card fhint:p-0 fhint:text-foreground fhint:shadow-sm fhint:hover:bg-destructive fhint:hover:text-white",
                focus,
              )}
            >
              <XIcon aria-hidden="true" className="fhint:size-3.5" />
              <span className="fhint:sr-only">
                {__("Remove photo", "foundhint-local-seo")}
              </span>
            </button>
          </div>
        ) : null}

        <PhotoChooser
          hasPhoto={Boolean(value)}
          busy={choice.busy}
          onFiles={choice.onFiles}
          onAttachments={choice.onAttachments}
          onGallery={() => setPicking(true)}
        />
      </div>

      <PhotoNotes
        mediaCount={mediaCount}
        reachable={reachable}
        uploadsReachable={uploadsReachable}
        error={choice.message || error}
      />

      {picking ? (
        <GooglePhotoPicker
          locationName={locationName}
          onClose={() => setPicking(false)}
          onPick={(url) => {
            onChange({ media_url: url, attachment_id: 0, reachable: true });
            setPicking(false);
          }}
        />
      ) : null}
    </div>
  );
}

export default PhotoField;
