import { __ } from "@wordpress/i18n";
import { errorText } from "../../styles";
import FieldHint from "./FieldHint";
import { fieldControl, counterText, fieldLabel } from "./styles";

const NAME_MAX = 140;

/**
 * The service's name, counted against the most Google allows.
 */
export function NameField({ id, value, invalid, onChange }) {
  return (
    <div className="fhint:grid fhint:gap-2.5">
      <div className="fhint:flex fhint:items-center fhint:gap-2">
        <label htmlFor={`${id}-name`} className={fieldLabel}>
          {__("Service name", "foundhint-local-seo")}
        </label>
        <FieldHint id={`${id}-name-hint`}>
          {__(
            "Use the words customers search for, like “Emergency dentist”.",
            "foundhint-local-seo",
          )}
        </FieldHint>
        <span className={counterText}>
          {value.length}/{NAME_MAX}
        </span>
      </div>
      <input
        id={`${id}-name`}
        value={value}
        maxLength={NAME_MAX}
        onChange={onChange}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={`${id}-name-hint`}
        className={fieldControl}
      />
      {invalid ? (
        <span role="alert" className={errorText}>
          {__("Please add a name for this service.", "foundhint-local-seo")}
        </span>
      ) : null}
    </div>
  );
}

export default NameField;
