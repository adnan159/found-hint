import { __ } from "@wordpress/i18n";
import { dialogInput } from "../../styles";
import { toInput } from "../../lib/posts";
import Field, { invalidProps } from "./Field";

/** Starts and Ends: date and time for an event, date only for an offer. */
export function DateFields({ id, form, set, errors }) {
  const withTime = form.topic_type === "event";

  return (
    <div className="fhint:grid fhint:gap-3 fhint:sm:grid-cols-2">
      {[
        ["starts_at", __("Starts", "foundhint-local-seo")],
        ["ends_at", __("Ends", "foundhint-local-seo")],
      ].map(([field, title]) => (
        <Field
          key={field}
          id={`${id}-${field}`}
          title={title}
          required
          error={errors[field]}
        >
          <input
            id={`${id}-${field}`}
            type={withTime ? "datetime-local" : "date"}
            value={toInput(form[field], withTime)}
            onChange={(event) => set({ [field]: event.target.value })}
            {...invalidProps(id, field, errors)}
            className={dialogInput}
          />
        </Field>
      ))}
    </div>
  );
}

export default DateFields;
