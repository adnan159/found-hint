import { __ } from "@wordpress/i18n";
import { ArrowUpToLineIcon, ImagesIcon } from "lucide-react";
import { cn } from "cn";
import { hasMediaLibrary } from "@/lib/media";
import { focus, help } from "@/pages/profile/styles";
import Picker from "@/pages/profile/components/photos/Picker";

// "Your gallery": a small pill, as on the Reviews dialogs.
const googlePill = cn(
  "fhint:inline-flex fhint:cursor-pointer fhint:items-center fhint:gap-1.5 fhint:rounded-full fhint:border fhint:border-input fhint:bg-card fhint:px-3 fhint:py-1 fhint:text-[13px] fhint:font-bold fhint:text-foreground fhint:hover:bg-muted",
  focus,
);

/**
 * The ways to choose a post's photo: the WordPress Media Library (or the
 * file picker where the library is not on the page), a dropped file, or a
 * photo already on the listing's Google gallery.
 */
export function PhotoChooser({
  hasPhoto,
  busy,
  onFiles,
  onAttachments,
  onGallery,
}) {
  const library = hasMediaLibrary();
  const title = __("Choose a photo for this post", "foundhint-local-seo");

  return (
    <div className="fhint:grid fhint:min-w-0 fhint:flex-1 fhint:rounded-[12px] fhint:border fhint:border-dashed fhint:border-primary/40 fhint:bg-primary/5">
      <Picker
        droppable
        disabled={busy}
        onFiles={onFiles}
        onAttachments={onAttachments}
        label={title}
        libraryTitle={title}
        className="fhint:flex fhint:cursor-pointer fhint:flex-wrap fhint:items-center fhint:gap-3 fhint:rounded-t-[12px] fhint:p-4 fhint:text-left fhint:transition-colors fhint:hover:bg-primary/10"
        draggingClassName="fhint:bg-primary/15"
      >
        <span
          aria-hidden="true"
          className="fhint:grid fhint:size-9 fhint:flex-none fhint:place-items-center fhint:rounded-[8px] fhint:bg-primary/15 fhint:text-primary"
        >
          <ArrowUpToLineIcon className="fhint:size-4" />
        </span>
        <span className="fhint:grid fhint:min-w-0 fhint:flex-1 fhint:gap-0.5">
          <strong className="fhint:text-sm fhint:font-extrabold">
            {hasPhoto
              ? __("Choose a different photo", "foundhint-local-seo")
              : __("Add a photo", "foundhint-local-seo")}
          </strong>
          <span className={help}>
            {library
              ? __(
                  "Drop a JPG or PNG here, or choose one from your Media Library.",
                  "foundhint-local-seo",
                )
              : __(
                  "Drop a JPG or PNG here, or choose one from your computer.",
                  "foundhint-local-seo",
                )}
          </span>
        </span>
        {/* Looks like a button; the whole area opens the picker. */}
        <span className="fhint:inline-flex fhint:items-center fhint:rounded-full fhint:bg-primary fhint:px-4.5 fhint:py-2.5 fhint:text-sm fhint:font-extrabold fhint:text-primary-foreground">
          {busy
            ? __("Adding…", "foundhint-local-seo")
            : __("Choose photo", "foundhint-local-seo")}
        </span>
      </Picker>
      <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2 fhint:border-t fhint:border-dashed fhint:border-t-primary/30 fhint:px-4 fhint:py-2">
        <span className="fhint:text-[13px] fhint:text-muted-strong">
          {__("Or use one already on Google:", "foundhint-local-seo")}
        </span>
        <button type="button" onClick={onGallery} className={googlePill}>
          <ImagesIcon aria-hidden="true" className="fhint:size-3" />
          {__("Your gallery", "foundhint-local-seo")}
        </button>
      </div>
    </div>
  );
}

export default PhotoChooser;
