import { __, sprintf } from "@wordpress/i18n";
import { cn } from "cn";

/**
 * Up to three listing photos as `image`. Read-only: thumbnails; editing:
 * the listing's photos to choose from.
 */
export function ImagePicker({
  id,
  value,
  photos,
  readOnly,
  onChange,
  describedBy,
}) {
  const choices = readOnly
    ? value
    : Array.from(new Set([...value, ...(photos ?? [])]));

  if (!choices.length) {
    return (
      <span
        id={id}
        className="fhint:text-[13px] fhint:text-muted-strong"
        aria-describedby={describedBy}
      >
        {__("No photos on your Google profile yet.", "foundhint-local-seo")}
      </span>
    );
  }

  return (
    <div
      id={id}
      role="group"
      aria-describedby={describedBy}
      className="fhint:grid fhint:gap-2"
    >
      <span className="fhint:text-[13px] fhint:text-foreground-soft">
        {sprintf(
          /* translators: 1: chosen photos, 2: photos on the profile. */
          __("%1$d chosen of %2$d Google photos", "foundhint-local-seo"),
          value.length,
          Math.max(value.length, photos?.length ?? 0),
        )}
      </span>
      <div className="fhint:flex fhint:flex-wrap fhint:gap-2">
        {choices.slice(0, readOnly ? 10 : 24).map((url, index) => {
          const on = value.includes(url);

          return readOnly ? (
            <img
              key={url}
              src={url}
              alt=""
              referrerPolicy="no-referrer"
              className="fhint:size-14 fhint:object-cover"
            />
          ) : (
            <button
              key={url}
              type="button"
              aria-pressed={on}
              onClick={() =>
                onChange(
                  on
                    ? value.filter((item) => item !== url)
                    : [...value, url].slice(0, 10),
                )
              }
              className={cn(
                "fhint:relative fhint:size-14 fhint:cursor-pointer fhint:overflow-hidden fhint:border-2 fhint:p-0",
                on
                  ? "fhint:border-primary"
                  : "fhint:border-transparent fhint:opacity-60",
              )}
            >
              <img
                src={url}
                alt=""
                referrerPolicy="no-referrer"
                className="fhint:size-full fhint:object-cover"
              />
              <span className="fhint:sr-only">
                {sprintf(
                  /* translators: %d: photo number. */
                  __("Photo %d", "foundhint-local-seo"),
                  index + 1,
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ImagePicker;
