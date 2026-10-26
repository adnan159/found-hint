import { useState } from "react";
import { __, sprintf } from "@wordpress/i18n";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "cn";
import { focus } from "@/pages/profile/styles";
import { dialogButton } from "../styles";
import ReviewsDialog from "./ReviewsDialog";

/**
 * The photos a customer attached to their review: small thumbnails under the
 * comment, each opening the large version in a viewer.
 *
 * Google's image host refuses some requests that carry a referrer, so none
 * is sent. A photo that will not load is dropped rather than left broken.
 *
 * @param {Object} props
 * @param {Array}  props.photos `[{ thumb, full }]` from the server.
 * @param {string} props.name   The reviewer's name, for the alt text.
 */
export function ReviewPhotos({ photos, name }) {
  const [open, setOpen] = useState(null);
  const [failed, setFailed] = useState([]);
  const shown = (photos ?? []).filter((photo) => !failed.includes(photo.thumb));

  if (!shown.length) {
    return null;
  }

  const current = open === null ? null : shown[open];
  const altFor = (index) =>
    sprintf(
      /* translators: 1: photo number, 2: how many photos, 3: the reviewer's name. */
      __("Photo %1$d of %2$d from %3$s", "foundhint-local-seo"),
      index + 1,
      shown.length,
      name,
    );

  return (
    <>
      <ul
        aria-label={__("Photos in this review", "foundhint-local-seo")}
        className="fhint:m-0 fhint:flex fhint:list-none fhint:flex-wrap fhint:gap-2 fhint:p-0"
      >
        {shown.map((photo, index) => (
          <li key={photo.thumb} className="fhint:m-0">
            <button
              type="button"
              onClick={() => setOpen(index)}
              className={cn(
                "fhint:block fhint:size-20 fhint:cursor-zoom-in fhint:overflow-hidden fhint:border fhint:border-border fhint:bg-muted fhint:p-0 fhint:hover:opacity-90",
                focus,
              )}
            >
              <img
                src={photo.thumb}
                alt={altFor(index)}
                width={80}
                height={80}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => setFailed((list) => [...list, photo.thumb])}
                className="fhint:size-full fhint:object-cover"
              />
            </button>
          </li>
        ))}
      </ul>

      {current ? (
        <ReviewsDialog
          title={altFor(open)}
          description={__(
            "The photo the customer attached to their review, at full size.",
            "foundhint-local-seo",
          )}
          width="fhint:sm:max-w-[760px]"
          onClose={() => setOpen(null)}
          note={__(
            "Photo shared on Google by the reviewer.",
            "foundhint-local-seo",
          )}
          footer={
            shown.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setOpen((open - 1 + shown.length) % shown.length)
                  }
                  className={dialogButton}
                >
                  <ChevronLeftIcon
                    aria-hidden="true"
                    className="fhint:size-3.5"
                  />
                  {__("Previous", "foundhint-local-seo")}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen((open + 1) % shown.length)}
                  className={dialogButton}
                >
                  {__("Next", "foundhint-local-seo")}
                  <ChevronRightIcon
                    aria-hidden="true"
                    className="fhint:size-3.5"
                  />
                </button>
              </>
            ) : null
          }
        >
          <img
            src={current.full}
            alt={altFor(open)}
            referrerPolicy="no-referrer"
            onError={(event) => {
              // The large size is a guess at Google's URL; fall back to the
              // thumbnail rather than show nothing.
              if (event.currentTarget.src !== current.thumb) {
                event.currentTarget.src = current.thumb;
              }
            }}
            className="fhint:mx-auto fhint:block fhint:max-h-[70vh] fhint:max-w-full fhint:object-contain"
          />
        </ReviewsDialog>
      ) : null}
    </>
  );
}

export default ReviewPhotos;
