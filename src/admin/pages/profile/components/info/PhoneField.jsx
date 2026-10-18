import { useId } from "react";
import { __ } from "@wordpress/i18n";
import Hint from "@/components/Hint";
import PhoneNumberInput from "@/components/PhoneNumberInput";
import { errorText, input, label as labelClass } from "../../styles";

/**
 * The main phone number: a country code and the number, with its label,
 * hint and error laid out as `TextField` lays out the boxes around it.
 */
export function PhoneField({ value, onChange, error, country }) {
  const id = useId();

  return (
    <div className="fhint:grid fhint:content-start fhint:gap-1.5">
      <div className="fhint:flex fhint:items-center fhint:gap-1.5">
        <label htmlFor={id} className={labelClass}>
          {__("Phone number", "foundhint-local-seo")}
        </label>
        <Hint
          about={__("Phone number", "foundhint-local-seo")}
          text={__(
            "The number customers call from your Google profile. Choose the country code, then the number without it — or write it in full, starting with + or 00.",
            "foundhint-local-seo",
          )}
        />
      </div>
      <PhoneNumberInput
        id={id}
        value={value}
        onChange={onChange}
        fallbackCountry={country}
        inputClass={input}
        invalid={Boolean(error)}
        describedBy={error ? `${id}-error` : undefined}
      />
      {error ? (
        <span id={`${id}-error`} role="alert" className={errorText}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

export default PhoneField;
