import { __, sprintf } from "@wordpress/i18n";
import { help } from "@/pages/profile/styles";
import { dialogInput } from "../../styles";
import Field, { invalidProps } from "./Field";

/**
 * When a scheduled post goes out: a date and time in the site's time zone,
 * named under the input so nobody has to guess whose 9 o'clock it is.
 */
export function ScheduleField({
  id,
  value,
  onChange,
  timezone,
  error,
  locked,
}) {
  const errors = error ? { scheduled_at: error } : {};

  return (
    <Field
      id={`${id}-scheduled_at`}
      title={__("Publish on", "foundhint-local-seo")}
      required
      error={error}
    >
      <input
        id={`${id}-scheduled_at`}
        type="datetime-local"
        value={value}
        readOnly={locked}
        onChange={(event) => onChange(event.target.value)}
        {...invalidProps(id, "scheduled_at", errors)}
        className={dialogInput}
      />
      {timezone ? (
        <span className={help}>
          {sprintf(
            /* translators: %s: the site's time zone, e.g. "Europe/London". */
            __(
              "Time zone: %s (from Settings → General).",
              "foundhint-local-seo",
            ),
            timezone,
          )}
        </span>
      ) : null}
    </Field>
  );
}

export default ScheduleField;
