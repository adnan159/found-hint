import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { ArrowUpToLineIcon } from "lucide-react";
import { errorText, help } from "../styles";
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

      {/* Logo, cover and the gallery's picker side by side, as in the
          design; they stack on a narrow screen. */}
      <div className="fhint:grid fhint:grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] fhint:items-stretch fhint:gap-[18px]">
        <PhotoSlot
          title={__("Logo", "foundhint-local-seo")}
          shape={__("Square", "foundhint-local-seo")}
          placeholder={__("Your logo", "foundhint-local-seo")}
          photo={media?.logo}
          waiting={waitingFor("logo")}
          disabled={busy}
          onFiles={add("logo")}
        />
        <PhotoSlot
          title={__("Cover photo", "foundhint-local-seo")}
          shape={__("Wide", "foundhint-local-seo")}
          placeholder={__("Your cover photo", "foundhint-local-seo")}
          photo={media?.cover}
          waiting={waitingFor("cover")}
          disabled={busy}
          onFiles={add("cover")}
          wide
        />

        <Picker
          droppable
          multiple
          disabled={busy}
          onFiles={add("gallery")}
          label={__("Choose photos for your gallery", "foundhint-local-seo")}
          className="fhint:grid fhint:cursor-pointer fhint:content-start fhint:justify-items-start fhint:gap-2.5 fhint:rounded-[12px] fhint:border fhint:border-dashed fhint:border-primary/40 fhint:bg-primary/5 fhint:p-4 fhint:text-left fhint:transition-colors fhint:hover:bg-primary/10"
          draggingClassName="fhint:border-primary fhint:bg-primary/15"
        >
          <span
            aria-hidden="true"
            className="fhint:grid fhint:size-9 fhint:place-items-center fhint:rounded-[8px] fhint:bg-primary/15 fhint:text-primary"
          >
            <ArrowUpToLineIcon className="fhint:size-4" />
          </span>
          <strong className="fhint:text-[14.5px] fhint:font-extrabold">
            {__("Add photos to your gallery", "foundhint-local-seo")}
          </strong>
          <span className={cn(help, "fhint:leading-relaxed")}>
            {__(
              "Pick several at once. You can check them before they go to Google.",
              "foundhint-local-seo",
            )}
          </span>
          {/* Looks like a button; the whole card is what opens the picker. */}
          <span className="fhint:mt-1 fhint:inline-flex fhint:items-center fhint:rounded-full fhint:bg-primary fhint:px-[18px] fhint:py-2.5 fhint:text-[13.5px] fhint:font-extrabold fhint:text-primary-foreground">
            {busy && !sending
              ? __("Working…", "foundhint-local-seo")
              : gallery.length
                ? __("Add more photos", "foundhint-local-seo")
                : __("Choose photos", "foundhint-local-seo")}
          </span>
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
        <div className="fhint:rounded-[12px] fhint:border fhint:border-dashed fhint:border-input fhint:px-6 fhint:py-7">
          <strong className="fhint:mb-1.5 fhint:block fhint:text-base fhint:font-extrabold">
            {__("Your Google photos will appear here", "foundhint-local-seo")}
          </strong>
          <span
            className={cn(
              help,
              "fhint:block fhint:max-w-[62ch] fhint:text-[13.5px] fhint:leading-relaxed",
            )}
          >
            {google?.mapped
              ? __(
                  "Press Refresh from Google at the top of the page and FoundHint will load every photo on your listing, from you and from your customers.",
                  "foundhint-local-seo",
                )
              : __(
                  "Connect your Google Business Profile and FoundHint will load every photo on your listing, from you and from your customers.",
                  "foundhint-local-seo",
                )}
          </span>
        </div>
      ) : null}
    </>
  );
}

export default PhotosSection;
