import { __, sprintf } from "@wordpress/i18n";
import { cn } from "cn";
import { errorText, label } from "@/pages/profile/styles";
import { dialogInput } from "../../styles";
import { MAX_BYTES } from "../../lib/replies";

/**
 * The reply box: its label, how much of Google's limit is used, and the
 * errors under it.
 *
 * @param {Object}   props
 * @param {string}   props.id           The textarea's id.
 * @param {string}   props.draft        The reply.
 * @param {number}   props.used         Bytes used.
 * @param {boolean}  props.tooLong      Past Google's limit.
 * @param {string}   props.fieldError   A message for the reply.
 * @param {string}   props.requestError A message not tied to it.
 * @param {Function} props.onChange     Receives the new text.
 */
export function ReplyField({
  id,
  draft,
  used,
  tooLong,
  fieldError,
  requestError,
  onChange,
}) {
  return (
    <>
      <span className="fhint:flex fhint:items-center fhint:gap-2">
        <label htmlFor={id} className={label}>
          {__("Your reply", "foundhint-local-seo")}
        </label>
        <span
          className={cn(
            "fhint:ml-auto fhint:text-[12px] fhint:font-semibold",
            tooLong ? "fhint:text-destructive" : "fhint:text-muted-strong",
          )}
        >
          {sprintf(
            /* translators: 1: bytes used, 2: the most Google allows. */
            __("%1$s / %2$s", "foundhint-local-seo"),
            used.toLocaleString(),
            MAX_BYTES.toLocaleString(),
          )}
        </span>
      </span>
      <textarea
        id={id}
        value={draft}
        rows={6}
        autoFocus
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={fieldError ? true : undefined}
        aria-describedby={fieldError ? `${id}-error` : undefined}
        placeholder={__(
          "Write a short, personal reply. Use their first name and mention something they said.",
          "foundhint-local-seo",
        )}
        className={cn(dialogInput, "fhint:resize-y")}
      />
      {fieldError ? (
        <span id={`${id}-error`} role="alert" className={errorText}>
          {fieldError}
        </span>
      ) : null}
      {requestError ? (
        <span role="alert" className={errorText}>
          {requestError}
        </span>
      ) : null}
    </>
  );
}

export default ReplyField;
