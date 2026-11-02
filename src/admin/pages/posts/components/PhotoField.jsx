import { useState } from "react";
import { __, _n, sprintf } from "@wordpress/i18n";
import {
  ArrowUpToLineIcon,
  ImagesIcon,
  TriangleAlertIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { cn } from "cn";
import { errorMessage, fieldErrors } from "@/lib/errors";
import { errorText, focus, help, label } from "@/pages/profile/styles";
import ReviewsDialog from "@/pages/reviews/components/ReviewsDialog";
import Picker from "@/pages/profile/components/photos/Picker";
import { dialogButton } from "../styles";
import {
  useGetPostPhotosQuery,
  useUploadPostPhotoMutation,
} from "@/store/api/postsApi";

// "Your gallery" / "Customer photos": a small pill, as on the Reviews dialogs.
const googlePill = cn(
  "fhint:inline-flex fhint:cursor-pointer fhint:items-center fhint:gap-1.5 fhint:rounded-full fhint:border fhint:border-input fhint:bg-card fhint:px-3 fhint:py-1 fhint:text-[13px] fhint:font-bold fhint:text-foreground fhint:hover:bg-muted",
  focus,
);

/**
 * Pick photos already on Google: the listing's gallery, or customers'.
 */
function PhotoPicker({ kind, locationName, onPick, onClose }) {
  const { data, isLoading } = useGetPostPhotosQuery({ locationName });
  const photos = (kind === "customer" ? data?.customer : data?.gallery) ?? [];

  return (
    <ReviewsDialog
      title={
        kind === "customer"
          ? __("Customer photos", "foundhint-local-seo")
          : __("Your gallery", "foundhint-local-seo")
      }
      description={__(
        "Choose a photo that is already on your Google profile.",
        "foundhint-local-seo",
      )}
      width="fhint:sm:max-w-[640px]"
      onClose={onClose}
      note={
        kind === "customer"
          ? __(
              "Photos customers added to their reviews. Only use one with their permission.",
              "foundhint-local-seo",
            )
          : __("Photos on your Google Business Profile.", "foundhint-local-seo")
      }
      footer={
        <button type="button" onClick={onClose} className={dialogButton}>
          {__("Cancel", "foundhint-local-seo")}
        </button>
      }
    >
      {isLoading ? (
        <p className={help}>{__("Loading photos…", "foundhint-local-seo")}</p>
      ) : photos.length ? (
        <ul className="fhint:m-0 fhint:grid fhint:list-none fhint:grid-cols-3 fhint:gap-2 fhint:p-0 fhint:sm:grid-cols-4">
          {photos.map((photo, index) => (
            <li key={photo.url} className="fhint:m-0">
              <button
                type="button"
                onClick={() => onPick(photo.url)}
                className={cn(
                  "fhint:block fhint:aspect-square fhint:w-full fhint:cursor-pointer fhint:overflow-hidden fhint:border fhint:border-border fhint:bg-muted fhint:p-0 fhint:hover:opacity-90",
                  focus,
                )}
              >
                <img
                  src={photo.thumb || photo.url}
                  alt={
                    photo.label
                      ? sprintf(
                          /* translators: %s: the customer's name. */
                          __("Photo from %s", "foundhint-local-seo"),
                          photo.label,
                        )
                      : sprintf(
                          /* translators: %d: photo number. */
                          __("Photo %d", "foundhint-local-seo"),
                          index + 1,
                        )
                  }
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="fhint:size-full fhint:object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={help}>
          {kind === "customer"
            ? __(
                "None of this location's reviews has a photo yet. Sync reviews to check for new ones.",
                "foundhint-local-seo",
              )
            : __(
                "This location has no photos on Google yet. Add them on the Business screen's Photos tab.",
                "foundhint-local-seo",
              )}
        </p>
      )}
    </ReviewsDialog>
  );
}

/**
 * The photo on a post: what is chosen, and the ways to choose one.
 *
 * Google fetches a post's photo from its link. An uploaded photo works
 * only when this site is public, so that is said as soon as it matters.
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
  const [picking, setPicking] = useState("");
  const [upload, { isLoading: uploading, error: uploadError, reset }] =
    useUploadPostPhotoMutation();
  const uploadMessage =
    fieldErrors(uploadError).file ??
    (uploadError ? errorMessage(uploadError) : "");

  const onFiles = async ([file]) => {
    if (!file) {
      return;
    }

    reset();

    try {
      const result = await upload({ file, locationName }).unwrap();

      onChange({
        media_url: result.url,
        attachment_id: result.attachment_id,
        reachable: result.reachable,
        viaGallery: result.via_gallery,
      });
    } catch {
      // Shown under the buttons.
    }
  };

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

        <div className="fhint:grid fhint:min-w-0 fhint:flex-1 fhint:rounded-[12px] fhint:border fhint:border-dashed fhint:border-primary/40 fhint:bg-primary/5">
          <Picker
            droppable
            disabled={uploading}
            onFiles={onFiles}
            label={__("Upload a photo for this post", "foundhint-local-seo")}
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
                {value
                  ? __("Upload a different photo", "foundhint-local-seo")
                  : __("Upload a photo", "foundhint-local-seo")}
              </strong>
              <span className={help}>
                {__(
                  "Drop a JPG or PNG here, or choose one from your computer.",
                  "foundhint-local-seo",
                )}
              </span>
            </span>
            {/* Looks like a button; the whole upload area opens the picker. */}
            <span className="fhint:inline-flex fhint:items-center fhint:rounded-full fhint:bg-primary fhint:px-[18px] fhint:py-2.5 fhint:text-sm fhint:font-extrabold fhint:text-primary-foreground">
              {uploading
                ? __("Uploading…", "foundhint-local-seo")
                : __("Choose photo", "foundhint-local-seo")}
            </span>
          </Picker>
          <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2 fhint:border-t fhint:border-dashed fhint:border-t-primary/30 fhint:px-4 fhint:py-2">
            <span className="fhint:text-[13px] fhint:text-muted-strong">
              {__("Or use one already on Google:", "foundhint-local-seo")}
            </span>
            <button
              type="button"
              onClick={() => setPicking("gallery")}
              className={googlePill}
            >
              <ImagesIcon aria-hidden="true" className="fhint:size-3" />
              {__("Your gallery", "foundhint-local-seo")}
            </button>
            <button
              type="button"
              onClick={() => setPicking("customer")}
              className={googlePill}
            >
              <UsersIcon aria-hidden="true" className="fhint:size-3" />
              {__("Customer photos", "foundhint-local-seo")}
            </button>
          </div>
        </div>
      </div>

      {mediaCount > 1 ? (
        <span className={help}>
          {sprintf(
            /* translators: %d: number of photos and videos. */
            _n(
              "This post has %d photo or video on Google. Changing or removing the photo here replaces it.",
              "This post has %d photos and videos on Google. Changing or removing the photo here replaces all of them.",
              mediaCount,
              "foundhint-local-seo",
            ),
            mediaCount,
          )}
        </span>
      ) : null}
      {reachable === false ? (
        <span
          role="alert"
          className="fhint:flex fhint:gap-1.5 fhint:text-sm fhint:font-semibold fhint:text-destructive"
        >
          <TriangleAlertIcon
            aria-hidden="true"
            className="fhint:mt-0.5 fhint:size-3.5 fhint:flex-none"
          />
          {__(
            "Google cannot open photos stored on this site, because it is not on the public internet. Choose one from Your gallery or Customer photos instead.",
            "foundhint-local-seo",
          )}
        </span>
      ) : null}

      {uploadsReachable ? null : (
        <span className={help}>
          {__(
            "This site is not on the public internet, so Google cannot open a photo stored here. An uploaded photo is added to your Google profile's Photos first, and the post uses it from there.",
            "foundhint-local-seo",
          )}
        </span>
      )}

      {uploadMessage || error ? (
        <span role="alert" className={errorText}>
          {uploadMessage || error}
        </span>
      ) : null}

      {picking ? (
        <PhotoPicker
          kind={picking}
          locationName={locationName}
          onClose={() => setPicking("")}
          onPick={(url) => {
            onChange({ media_url: url, attachment_id: 0, reachable: true });
            setPicking("");
          }}
        />
      ) : null}
    </div>
  );
}

export default PhotoField;
