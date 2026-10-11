import { useId, useRef, useState } from "react";
import { __, _n, sprintf } from "@wordpress/i18n";
import { Link } from "react-router";
import { cn } from "cn";
import { errorMessage, fieldErrors } from "@/lib/errors";
import {
  useAddPhotoMutation,
  usePublishPhotoMutation,
  useRemovePhotoMutation,
} from "@/store/api/profileApi";
import {
  errorText,
  focus,
  help,
  label,
  linkButton,
  primaryButton,
  quietButton,
  tag,
  tagTones,
} from "../styles";

const PAGE = 24;

/**
 * A smaller copy of a photo, where Google can make one.
 *
 * Google serves a listing's photos at full camera size, and its image host
 * resizes on request when a size is appended to the address. Anything that
 * is not on that host — a file in this site's media library — is used as it
 * is.
 */
function thumb(url, size = 400) {
  const value = String(url ?? "");

  if (!/^https:\/\/lh\d+\.googleusercontent\.com\//.test(value)) {
    return value;
  }

  // Google often hands the address over already asking for full size
  // (`=s0`); that request is replaced, not added to.
  return `${value.replace(/=[^/=]*$/, "")}=w${size}-h${size}-c`;
}

const STATES = {
  pending: {
    tone: tagTones.accent,
    label: () => __("Ready to upload", "foundhint-local-seo"),
  },
  uploading: {
    tone: tagTones.quiet,
    label: () => __("Uploading…", "foundhint-local-seo"),
  },
  failed: {
    tone: tagTones.bad,
    label: () => __("Not accepted", "foundhint-local-seo"),
  },
};

/**
 * A button that opens the file picker.
 *
 * A real `<input type="file">` does the work, hidden but still focusable and
 * labelled, so it is reachable from the keyboard and announced as what it is.
 */
function Picker({ children, multiple, disabled, onFiles, className }) {
  const id = useId();
  const input = useRef(null);

  return (
    <>
      <input
        ref={input}
        id={id}
        type="file"
        accept="image/jpeg,image/png"
        multiple={multiple}
        disabled={disabled}
        onChange={(event) => {
          const files = [...(event.target.files ?? [])];

          // Cleared so choosing the same file twice still fires a change.
          event.target.value = "";

          if (files.length) {
            onFiles(files);
          }
        }}
        className="fhint:peer fhint:sr-only"
      />
      <label
        htmlFor={id}
        className={cn(
          className,
          disabled && "fhint:cursor-not-allowed fhint:opacity-60",
          // The input is what takes focus; show it on the visible control.
          "fhint:peer-focus-visible:ring-2 fhint:peer-focus-visible:ring-ring fhint:peer-focus-visible:ring-offset-1",
        )}
      >
        {children}
      </label>
    </>
  );
}

function Slot({ title, shape, photo, waiting, wide, disabled, onFiles }) {
  const shown = waiting ?? photo;

  return (
    <div className="fhint:grid fhint:content-start fhint:gap-2">
      <span className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2">
        <span className={label}>{title}</span>
        <span className={cn(tag, tagTones.quiet)}>{shape}</span>
        {waiting ? (
          <span
            className={cn(tag, STATES[waiting.state]?.tone ?? tagTones.accent)}
          >
            {STATES[waiting.state]?.label() ?? waiting.state}
          </span>
        ) : photo ? (
          <span className={cn(tag, tagTones.ok)}>
            {__("On Google", "foundhint-local-seo")}
          </span>
        ) : null}
      </span>
      <div
        className={cn(
          "fhint:grid fhint:place-items-center fhint:overflow-hidden fhint:border fhint:bg-muted fhint:text-[12.5px] fhint:text-muted-foreground",
          wide
            ? "fhint:aspect-video"
            : "fhint:aspect-square fhint:max-w-[180px]",
          shown?.url
            ? "fhint:border-border"
            : "fhint:border-dashed fhint:border-input",
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
          __("Not set", "foundhint-local-seo")
        )}
      </div>
      <span>
        <Picker disabled={disabled} onFiles={onFiles} className={quietButton}>
          {shown
            ? __("Choose another", "foundhint-local-seo")
            : __("Choose photo", "foundhint-local-seo")}
        </Picker>
      </span>
    </div>
  );
}

/**
 * The listing's photos, and the ones on their way to it.
 *
 * Choosing a photo and sending it are two steps on purpose. A chosen photo
 * is kept on this site and shown under "Ready to upload"; nothing reaches
 * the public listing until "Upload to Google" is pressed, and then they go
 * one at a time so each can say whether Google took it.
 */
export function PhotosSection({ media, google, locationId, onChanged }) {
  const [addPhoto] = useAddPhotoMutation();
  const [removePhoto] = useRemovePhotoMutation();
  const [publishPhoto] = usePublishPhotoMutation();

  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(null);
  const [problems, setProblems] = useState([]);
  const [shown, setShown] = useState(PAGE);

  const gallery = media?.gallery ?? [];
  const waiting = media?.pending ?? [];
  const waitingFor = (role) => waiting.find((photo) => photo.role === role);
  const queue = waiting.filter((photo) => photo.state !== "uploading");
  const nothing =
    !media?.logo && !media?.cover && !gallery.length && !waiting.length;

  const add = (role) => async (files) => {
    setBusy(true);
    setProblems([]);

    const refused = [];

    // One at a time: each is a file being stored, and a failure names its file.
    for (const file of files) {
      try {
        await addPhoto({ file, role, locationId }).unwrap();
      } catch (error) {
        refused.push({
          name: file.name,
          message: fieldErrors(error).file ?? errorMessage(error),
        });
      }
    }

    setProblems(refused);
    setBusy(false);
  };

  const remove = async (photos) => {
    setBusy(true);
    setProblems([]);

    for (const photo of photos) {
      try {
        await removePhoto({ id: photo.id, locationId }).unwrap();
      } catch (error) {
        setProblems([{ name: "", message: errorMessage(error) }]);
        break;
      }
    }

    setBusy(false);
  };

  const upload = async () => {
    setBusy(true);
    setProblems([]);

    let failed = 0;

    // In order and one at a time, so each photo reports for itself and
    // Google is not handed a burst of writes.
    for (const photo of queue) {
      setSending(photo.id);

      try {
        await publishPhoto({ id: photo.id, locationId }).unwrap();
      } catch {
        failed += 1;
      }
    }

    setSending(null);
    setBusy(false);

    // A refusal comes back as an error, not as the profile, so the reason
    // Google gave is read back from the server.
    if (failed) {
      onChanged?.();
    }
  };

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
        <Slot
          title={__("Logo", "foundhint-local-seo")}
          shape={__("Square", "foundhint-local-seo")}
          photo={media?.logo}
          waiting={waitingFor("logo")}
          disabled={busy}
          onFiles={add("logo")}
        />
        <Slot
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
        <div className="fhint:grid fhint:gap-3 fhint:border fhint:border-notice-border fhint:bg-notice fhint:p-[15px]">
          <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3">
            <div className="fhint:min-w-0 fhint:flex-1 fhint:text-notice-foreground">
              <strong className="fhint:block fhint:text-[13.5px]">
                {sprintf(
                  /* translators: %d: number of photos. */
                  _n(
                    "%d photo ready to upload",
                    "%d photos ready to upload",
                    waiting.length,
                    "foundhint-local-seo",
                  ),
                  waiting.length,
                )}
              </strong>
              <span className="fhint:text-[12.5px]">
                {google?.mapped
                  ? __(
                      "Not on Google yet. Press Upload to Google to send them.",
                      "foundhint-local-seo",
                    )
                  : __(
                      "Not on Google yet. Connect Google to send them.",
                      "foundhint-local-seo",
                    )}
              </span>
            </div>
            <button
              type="button"
              onClick={() => remove(waiting)}
              disabled={busy}
              className={linkButton}
            >
              {__("Remove all", "foundhint-local-seo")}
            </button>
            {google?.mapped ? (
              <button
                type="button"
                onClick={upload}
                disabled={busy || !queue.length}
                className={primaryButton}
              >
                {sending
                  ? __("Uploading…", "foundhint-local-seo")
                  : __("Upload to Google", "foundhint-local-seo")}
              </button>
            ) : (
              <Link
                to="/google"
                className={cn(primaryButton, "fhint:no-underline")}
              >
                {__("Connect Google", "foundhint-local-seo")}
              </Link>
            )}
          </div>
          <ul className="fhint:m-0 fhint:grid fhint:list-none fhint:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] fhint:gap-2.5 fhint:p-0">
            {waiting.map((photo) => {
              const state =
                sending === photo.id ? STATES.uploading : STATES[photo.state];

              return (
                <li
                  key={photo.id}
                  className="fhint:m-0 fhint:grid fhint:gap-1.5 fhint:border fhint:border-border fhint:bg-card fhint:p-1.5"
                >
                  <div className="fhint:relative fhint:aspect-square fhint:overflow-hidden fhint:bg-muted">
                    {photo.url ? (
                      <img
                        src={photo.url}
                        alt=""
                        loading="lazy"
                        className="fhint:size-full fhint:object-cover"
                      />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => remove([photo])}
                      disabled={busy}
                      aria-label={__(
                        "Remove this photo",
                        "foundhint-local-seo",
                      )}
                      className={cn(
                        "fhint:absolute fhint:top-1 fhint:right-1 fhint:grid fhint:size-6 fhint:cursor-pointer fhint:place-items-center fhint:border-0 fhint:bg-foreground/80 fhint:text-[15px] fhint:leading-none fhint:text-card",
                        focus,
                      )}
                    >
                      ×
                    </button>
                  </div>
                  <span className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-1.5">
                    <span className={cn(tag, state?.tone ?? tagTones.quiet)}>
                      {state?.label() ?? photo.state}
                    </span>
                    {photo.role !== "gallery" ? (
                      <span className={cn(tag, tagTones.quiet)}>
                        {photo.role === "logo"
                          ? __("Logo", "foundhint-local-seo")
                          : __("Cover", "foundhint-local-seo")}
                      </span>
                    ) : null}
                  </span>
                  {photo.state === "failed" && photo.error ? (
                    <span className={errorText}>{photo.error}</span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {gallery.length ? (
        <div className="fhint:grid fhint:gap-2">
          <div className="fhint:flex fhint:items-baseline fhint:gap-2">
            <h3 className={cn(label, "fhint:m-0 fhint:text-sm")}>
              {__("Photo gallery", "foundhint-local-seo")}
            </h3>
            <span className={help}>
              {sprintf(
                /* translators: %d: number of photos. */
                _n(
                  "%d photo",
                  "%d photos",
                  gallery.length,
                  "foundhint-local-seo",
                ),
                gallery.length,
              )}
            </span>
          </div>
          <ul className="fhint:m-0 fhint:grid fhint:list-none fhint:grid-cols-[repeat(auto-fill,minmax(130px,1fr))] fhint:gap-2.5 fhint:p-0">
            {gallery.slice(0, shown).map((photo) => (
              <li
                key={photo.id}
                className="fhint:m-0 fhint:aspect-square fhint:overflow-hidden fhint:border fhint:border-border fhint:bg-muted"
              >
                {photo.url ? (
                  <img
                    src={thumb(photo.url)}
                    alt={__(
                      "Photo on your Google listing",
                      "foundhint-local-seo",
                    )}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="fhint:size-full fhint:object-cover"
                  />
                ) : null}
              </li>
            ))}
          </ul>
          {gallery.length > shown ? (
            <span>
              <button
                type="button"
                onClick={() => setShown((count) => count + PAGE)}
                className={quietButton}
              >
                {__("Show more", "foundhint-local-seo")}
              </button>
            </span>
          ) : null}
        </div>
      ) : null}

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
