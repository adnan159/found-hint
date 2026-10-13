import { __, sprintf } from "@wordpress/i18n";
import { cn } from "cn";
import { SERVICE_DESCRIPTION_MAX } from "../../model";
import { errorText } from "../../styles";
import { fieldControl, counterText, fieldLabel, optionalText } from "./styles";

/**
 * An optional description, counted against the most Google shows.
 */
export function ServiceDescriptionField({ id, value, onChange }) {
  const tooLong = value.length > SERVICE_DESCRIPTION_MAX;

  return (
    <div className="fhint:grid fhint:gap-2.5">
      <div className="fhint:flex fhint:items-center fhint:gap-2">
        <label htmlFor={`${id}-description`} className={fieldLabel}>
          {__("Description", "foundhint-local-seo")}
        </label>
        <span className={optionalText}>
          {__("Optional", "foundhint-local-seo")}
        </span>
        <span className={cn(counterText, tooLong && "fhint:text-destructive")}>
          {value.length}/{SERVICE_DESCRIPTION_MAX}
        </span>
      </div>
      <textarea
        id={`${id}-description`}
        rows={4}
        value={value}
        onChange={onChange}
        placeholder={__(
          "What this service is, in one or two plain sentences",
          "foundhint-local-seo",
        )}
        aria-invalid={tooLong ? true : undefined}
        className={cn(fieldControl, "fhint:resize-y fhint:leading-[1.5]")}
      />
      {tooLong ? (
        <span role="alert" className={errorText}>
          {sprintf(
            /* translators: %d: the most characters allowed. */
            __(
              "Google shows %d characters at most. Please shorten it.",
              "foundhint-local-seo",
            ),
            SERVICE_DESCRIPTION_MAX,
          )}
        </span>
      ) : null}
    </div>
  );
}

export default ServiceDescriptionField;
