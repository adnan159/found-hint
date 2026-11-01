import { __, sprintf } from "@wordpress/i18n";
import { XIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { errorMessage } from "@/lib/errors";
import { focus } from "@/pages/profile/styles";
import { useImportSchemaPhotoMutation } from "@/store/api/schemaManagerApi";
import { chooseImages, hasMediaLibrary } from "../../lib/media";
import { chip, muted } from "../styles";

const MAX = 10;

/**
 * Photos as `image`, served from this site (QA D3/D4): chosen from the
 * Media Library, or a Google profile photo copied into it first. Google
 * account pictures are never offered — the server removes them.
 *
 * `photos` are the listing's photos: `{ url, imported: {id,url}|null }`.
 */
export function ImagePicker({
  id,
  value,
  photos,
  readOnly,
  onChange,
  describedBy,
}) {
  const [importPhoto, importState] = useImportSchemaPhotoMutation();
  const pending = importState.isLoading ? importState.originalArgs : null;

  const add = (urls) =>
    onChange(Array.from(new Set([...value, ...urls])).slice(0, MAX));

  const pick = async () => {
    const images = await chooseImages({
      title: __("Choose photos of your business", "foundhint-local-seo"),
      button: __("Add photos", "foundhint-local-seo"),
      multiple: true,
    });

    if (images.length) {
      add(images.map((image) => image.url));
    }
  };

  const addGooglePhoto = async (photo) => {
    if (photo.imported) {
      add([photo.imported.url]);
      return;
    }

    try {
      const imported = await importPhoto(photo.url).unwrap();

      add([imported.url]);
      toast.success(
        __("Photo added to your Media Library.", "foundhint-local-seo"),
      );
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const google = (photos ?? []).filter(
    (photo) => !photo.imported || !value.includes(photo.imported.url),
  );

  return (
    <div
      id={id}
      role="group"
      aria-describedby={describedBy}
      className="fhint:grid fhint:gap-2.5"
    >
      {value.length ? (
        <ul className="fhint:m-0 fhint:flex fhint:list-none fhint:flex-wrap fhint:gap-2 fhint:p-0">
          {value.map((url, index) => (
            <li key={url} className="fhint:relative fhint:size-16">
              <img
                src={url}
                alt={sprintf(
                  /* translators: %d: photo number. */
                  __("Photo %d", "foundhint-local-seo"),
                  index + 1,
                )}
                className="fhint:size-full fhint:border fhint:border-border fhint:object-cover"
              />
              {readOnly ? null : (
                <button
                  type="button"
                  onClick={() => onChange(value.filter((item) => item !== url))}
                  aria-label={sprintf(
                    /* translators: %d: photo number. */
                    __("Remove photo %d", "foundhint-local-seo"),
                    index + 1,
                  )}
                  className={cn(
                    "fhint:absolute fhint:-top-1.5 fhint:-right-1.5 fhint:inline-flex fhint:size-5 fhint:cursor-pointer fhint:items-center fhint:justify-center fhint:rounded-full fhint:border-0 fhint:bg-foreground fhint:p-0 fhint:text-background",
                    focus,
                  )}
                >
                  <XIcon aria-hidden="true" className="fhint:size-3" />
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <span className={muted}>
          {readOnly
            ? __("No photos chosen.", "foundhint-local-seo")
            : __(
                "No photos chosen. Without photos, your logo is used as the image.",
                "foundhint-local-seo",
              )}
        </span>
      )}

      {readOnly ? null : (
        <>
          <span className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2">
            <button
              type="button"
              onClick={pick}
              disabled={!hasMediaLibrary() || value.length >= MAX}
              className={cn(chip(false), "fhint:disabled:opacity-50")}
            >
              {__("Choose from Media Library", "foundhint-local-seo")}
            </button>
            <span className={muted}>
              {sprintf(
                /* translators: 1: chosen photos, 2: the most allowed. */
                __("%1$d of %2$d", "foundhint-local-seo"),
                value.length,
                MAX,
              )}
            </span>
          </span>

          {google.length ? (
            <div className="fhint:grid fhint:gap-1.5">
              <span className={muted}>
                {__(
                  "From your Google profile — added to your Media Library first, so your site serves them:",
                  "foundhint-local-seo",
                )}
              </span>
              <div className="fhint:flex fhint:flex-wrap fhint:gap-2">
                {google.slice(0, 12).map((photo, index) => {
                  const busy = pending === photo.url;

                  return (
                    <button
                      key={photo.url}
                      type="button"
                      disabled={Boolean(pending) || value.length >= MAX}
                      onClick={() => addGooglePhoto(photo)}
                      aria-label={
                        photo.imported
                          ? sprintf(
                              /* translators: %d: photo number. */
                              __("Use Google photo %d", "foundhint-local-seo"),
                              index + 1,
                            )
                          : sprintf(
                              /* translators: %d: photo number. */
                              __(
                                "Add Google photo %d to your Media Library and use it",
                                "foundhint-local-seo",
                              ),
                              index + 1,
                            )
                      }
                      className={cn(
                        "fhint:relative fhint:size-14 fhint:cursor-pointer fhint:overflow-hidden fhint:border fhint:border-border fhint:p-0 fhint:disabled:cursor-default",
                        busy && "fhint:opacity-50",
                        focus,
                      )}
                    >
                      <img
                        src={photo.imported?.url ?? photo.url}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="fhint:size-full fhint:object-cover"
                      />
                      <span className="fhint:absolute fhint:inset-x-0 fhint:bottom-0 fhint:bg-foreground/75 fhint:py-px fhint:text-center fhint:text-[10.5px] fhint:font-bold fhint:text-background">
                        {busy
                          ? __("Adding…", "foundhint-local-seo")
                          : photo.imported
                            ? __("Use", "foundhint-local-seo")
                            : __("+ Add", "foundhint-local-seo")}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

export default ImagePicker;
