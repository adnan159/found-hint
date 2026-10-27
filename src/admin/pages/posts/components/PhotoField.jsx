import { useRef, useState } from "react";
import { __, _n, sprintf } from "@wordpress/i18n";
import {
  ImagesIcon,
  SparklesIcon,
  TriangleAlertIcon,
  UploadIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { cn } from "cn";
import { errorMessage, fieldErrors } from "@/lib/errors";
import { errorText, focus, help, label } from "@/pages/profile/styles";
import ReviewsDialog from "@/pages/reviews/components/ReviewsDialog";
import SoonTag from "@/pages/reviews/components/SoonTag";
import { dialogButton } from "@/pages/reviews/styles";
import {
  useGetPostPhotosQuery,
  useUploadPostPhotoMutation,
} from "@/store/api/postsApi";

const optionButton = cn(
  "fhint:inline-flex fhint:min-h-[42px] fhint:cursor-pointer fhint:items-center fhint:gap-2 fhint:border fhint:border-[#b9b2af] fhint:bg-card fhint:px-3 fhint:py-2 fhint:text-left fhint:text-[12.5px] fhint:leading-tight fhint:font-extrabold fhint:hover:bg-muted fhint:disabled:cursor-not-allowed fhint:disabled:border-[#e2dcda] fhint:disabled:text-muted-foreground fhint:disabled:hover:bg-card",
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
  const fileRef = useRef(null);
  const [picking, setPicking] = useState("");
  const [upload, { isLoading: uploading, error: uploadError, reset }] =
    useUploadPostPhotoMutation();
  const uploadMessage =
    fieldErrors(uploadError).file ??
    (uploadError ? errorMessage(uploadError) : "");

  const onFile = async (event) => {
    const file = event.target.files?.[0];

    event.target.value = "";

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

      {value ? (
        <div className="fhint:flex fhint:items-start fhint:gap-3 fhint:border fhint:border-border fhint:bg-muted/40 fhint:p-2.5">
          <img
            src={value}
            alt={__("The chosen photo", "foundhint-local-seo")}
            referrerPolicy="no-referrer"
            className="fhint:size-16 fhint:flex-none fhint:object-cover"
          />
          <div className="fhint:grid fhint:min-w-0 fhint:flex-1 fhint:gap-1.5">
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
                className="fhint:flex fhint:gap-1.5 fhint:text-[12.5px] fhint:font-semibold fhint:text-destructive"
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
            <button
              type="button"
              onClick={() =>
                onChange({ media_url: "", attachment_id: 0, reachable: true })
              }
              className={cn(dialogButton, "fhint:justify-self-start")}
            >
              <XIcon aria-hidden="true" className="fhint:size-3.5" />
              {__("Remove photo", "foundhint-local-seo")}
            </button>
          </div>
        </div>
      ) : null}

      <div className="fhint:grid fhint:grid-cols-2 fhint:gap-2 fhint:sm:grid-cols-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className={cn(optionButton, "fhint:border-dashed")}
        >
          <UploadIcon
            aria-hidden="true"
            className="fhint:size-4 fhint:flex-none"
          />
          {uploading
            ? __("Uploading…", "foundhint-local-seo")
            : __("Upload", "foundhint-local-seo")}
        </button>
        <button
          type="button"
          disabled
          title={__(
            "AI photos are part of FoundHint Pro.",
            "foundhint-local-seo",
          )}
          className={optionButton}
        >
          <SparklesIcon
            aria-hidden="true"
            className="fhint:size-4 fhint:flex-none"
          />
          <span className="fhint:grid fhint:gap-1">
            {__("Make with AI", "foundhint-local-seo")}
            <SoonTag kind="pro" className="fhint:justify-self-start" />
          </span>
        </button>
        <button
          type="button"
          onClick={() => setPicking("gallery")}
          className={optionButton}
        >
          <ImagesIcon
            aria-hidden="true"
            className="fhint:size-4 fhint:flex-none"
          />
          {__("Your gallery", "foundhint-local-seo")}
        </button>
        <button
          type="button"
          onClick={() => setPicking("customer")}
          className={optionButton}
        >
          <UsersIcon
            aria-hidden="true"
            className="fhint:size-4 fhint:flex-none"
          />
          {__("Customer photos", "foundhint-local-seo")}
        </button>
      </div>

      {uploadsReachable ? null : (
        <span className={help}>
          {__(
            "This site is not on the public internet, so Google cannot open a photo stored here. An uploaded photo is added to your Google profile's Photos first, and the post uses it from there.",
            "foundhint-local-seo",
          )}
        </span>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png"
        onChange={onFile}
        className="fhint:sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />

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
