import { __, sprintf } from "@wordpress/i18n";
import { cn } from "cn";
import { focus, help } from "@/pages/profile/styles";
import ReviewsDialog from "@/pages/reviews/components/ReviewsDialog";
import { useGetPostPhotosQuery } from "@/store/api/postsApi";
import { dialogButton } from "../../styles";

/**
 * Pick a photo already on the listing's Google gallery ("Your gallery").
 */
export function GooglePhotoPicker({ locationName, onPick, onClose }) {
  const { data, isLoading } = useGetPostPhotosQuery({ locationName });
  const photos = data?.gallery ?? [];

  return (
    <ReviewsDialog
      title={__("Your gallery", "foundhint-local-seo")}
      description={__(
        "Choose a photo that is already on your Google profile.",
        "foundhint-local-seo",
      )}
      width="fhint:sm:max-w-[640px]"
      onClose={onClose}
      note={__(
        "Photos on your Google Business Profile.",
        "foundhint-local-seo",
      )}
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
                  src={photo.url}
                  alt={sprintf(
                    /* translators: %d: photo number. */
                    __("Photo %d", "foundhint-local-seo"),
                    index + 1,
                  )}
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
          {__(
            "This location has no photos on Google yet. Add them on the Business screen's Photos tab.",
            "foundhint-local-seo",
          )}
        </p>
      )}
    </ReviewsDialog>
  );
}

export default GooglePhotoPicker;
