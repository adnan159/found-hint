import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { errorText, help, primaryButton } from "../styles";
import Gallery from "./photos/Gallery";
import PendingPhotos from "./photos/PendingPhotos";
import PhotoSlot from "./photos/PhotoSlot";
import Picker from "./photos/Picker";
import usePhotoActions from "./photos/usePhotoActions";

/**
 * The listing's photos, and the ones on their way to it.
 *
 * Choosing a photo and sending it are two steps on purpose. A chosen photo
 * is kept on this site and shown under "Ready to upload"; nothing reaches
 * the public listing until "Upload to Google" is pressed, and then they go
 * one at a time so each can say whether Google took it.
 */
export function PhotosSection({ media, google, locationId, onChanged }) {
  const { busy, sending, problems, add, remove, upload } = usePhotoActions(
    locationId,
    onChanged,
  );

  const gallery = media?.gallery ?? [];
  const waiting = media?.pending ?? [];
  const waitingFor = (role) => waiting.find((photo) => photo.role === role);
  const queue = waiting.filter((photo) => photo.state !== "uploading");
  const nothing =
    !media?.logo && !media?.cover && !gallery.length && !waiting.length;
  return (
    <>
      <p className={cn(help, "fhint:m-0 fhint:text-[13px]")}>
        <strong className="fhint:text-foreground">
          {__("What Google accepts:", "foundhint-local-seo")}
        </strong>{" "}
        {__(
          "JPG or PNG, up to 5 MB each. Your logo should be square. Your cover photo should be wide (16 by 9).",
          "foundhint-local-seo",
        )}
      </p>

      <div className="fhint:grid fhint:grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] fhint:gap-[18px]">
        <PhotoSlot
          title={__("Logo", "foundhint-local-seo")}
          shape={__("Square", "foundhint-local-seo")}
          photo={media?.logo}
          waiting={waitingFor("logo")}
          disabled={busy}
          onFiles={add("logo")}
        />
        <PhotoSlot
          title={__("Cover photo", "foundhint-local-seo")}
          shape={__("Wide", "foundhint-local-seo")}
          photo={media?.cover}
          waiting={waitingFor("cover")}
          disabled={busy}
          onFiles={add("cover")}
          wide
        />
      </div>

      <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3 fhint:border fhint:border-dashed fhint:border-input fhint:px-[15px] fhint:py-[13px]">
        <div className="fhint:min-w-0 fhint:flex-1">
          <strong className="fhint:block fhint:text-[13px]">
            {__("Add photos to your gallery", "foundhint-local-seo")}
          </strong>
          <span className={help}>
            {__(
              "Pick several at once. You can check them before they go to Google.",
              "foundhint-local-seo",
            )}
          </span>
        </div>
        <Picker
          multiple
          disabled={busy}
          onFiles={add("gallery")}
          className={primaryButton}
        >
          {busy && !sending
            ? __("Working…", "foundhint-local-seo")
            : __("Choose photos", "foundhint-local-seo")}
        </Picker>
      </div>

      <div aria-live="polite" className="fhint:grid fhint:gap-1">
        {problems.map((problem) => (
          <span
            key={`${problem.name}${problem.message}`}
            role="alert"
            className={errorText}
          >
            {problem.name ? `${problem.name}: ` : ""}
            {problem.message}
          </span>
        ))}
      </div>

      {waiting.length ? (
        <PendingPhotos
          waiting={waiting}
          sending={sending}
          busy={busy}
          mapped={Boolean(google?.mapped)}
          canUpload={queue.length > 0}
          onRemove={remove}
          onUpload={() => upload(queue)}
        />
      ) : null}

      {gallery.length ? <Gallery gallery={gallery} /> : null}

      {nothing ? (
        <div className="fhint:border fhint:border-dashed fhint:border-input fhint:bg-muted fhint:px-5 fhint:py-6">
          <strong className="fhint:block fhint:text-sm">
            {__("Your Google photos will appear here", "foundhint-local-seo")}
          </strong>
          <span className={help}>
            {google?.mapped
              ? __(
                  "Press Refresh from Google at the top of the page to load the photos on your listing.",
                  "foundhint-local-seo",
                )
              : __(
                  "Connect your Google Business Profile and FoundHint will load the photos on your listing.",
                  "foundhint-local-seo",
                )}
          </span>
        </div>
      ) : null}
    </>
  );
}

export default PhotosSection;
