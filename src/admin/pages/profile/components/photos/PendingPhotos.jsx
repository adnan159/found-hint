import { __, _n, sprintf } from "@wordpress/i18n";
import { Link } from "react-router";
import { cn } from "cn";
import {
  errorText,
  focus,
  linkButton,
  primaryButton,
  primaryLink,
  tag,
  tagTones,
} from "../../styles";
import { STATES } from "./lib";

/**
 * The photos chosen but not yet on Google: each with where it stands, and
 * the button that sends them.
 *
 * @param {Object}   props
 * @param {Object[]} props.waiting   The photos waiting.
 * @param {?number}  props.sending   The id of the one being sent right now.
 * @param {boolean}  props.busy      Whether any photo work is under way.
 * @param {boolean}  props.mapped    Whether a Google listing is chosen.
 * @param {boolean}  props.canUpload Whether anything is left to send.
 * @param {Function} props.onRemove  Remove the given photos.
 * @param {Function} props.onUpload  Send what is waiting to Google.
 */
export function PendingPhotos({
  waiting,
  sending,
  busy,
  mapped,
  canUpload,
  onRemove,
  onUpload,
}) {
  return (
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
            {mapped
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
          onClick={() => onRemove(waiting)}
          disabled={busy}
          className={linkButton}
        >
          {__("Remove all", "foundhint-local-seo")}
        </button>
        {mapped ? (
          <button
            type="button"
            onClick={onUpload}
            disabled={busy || !canUpload}
            className={primaryButton}
          >
            {sending
              ? __("Uploading…", "foundhint-local-seo")
              : __("Upload to Google", "foundhint-local-seo")}
          </button>
        ) : (
          <Link to="/google" className={primaryLink}>
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
                  onClick={() => onRemove([photo])}
                  disabled={busy}
                  aria-label={__("Remove this photo", "foundhint-local-seo")}
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
  );
}

export default PendingPhotos;
