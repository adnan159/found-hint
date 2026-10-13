import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { errorText } from "../../styles";
import FieldHint from "./FieldHint";
import { fieldControl, fieldLabel } from "./styles";

/**
 * The list of services Google already has for the listing's categories.
 *
 * @param {Object}   props
 * @param {string}   props.id            The dialog's id, the root of every
 *                                       field id in it.
 * @param {Object}   props.value         The service being edited.
 * @param {Object[]} props.googleTypes   Every service Google offers.
 * @param {Object[]} props.offered       Those not already used by another row.
 * @param {boolean}  props.chosenMissing Whether this row's own choice is no
 *                                       longer on Google's list.
 * @param {boolean}  props.invalid       Whether saving was tried with none
 *                                       chosen.
 * @param {Function} props.onChange      The select's change handler.
 */
export function GoogleTypeField({
  id,
  value,
  googleTypes,
  offered,
  chosenMissing,
  invalid,
  onChange,
}) {
  return (
    <div className="fhint:grid fhint:gap-2.5">
      <div className="fhint:flex fhint:items-center fhint:gap-2">
        <label htmlFor={`${id}-type`} className={fieldLabel}>
          {__("Google service", "foundhint-local-seo")}
        </label>
        <FieldHint id={`${id}-type-hint`}>
          {__(
            "Services Google already knows for your categories. Picking one helps Google match you to searches for it.",
            "foundhint-local-seo",
          )}
        </FieldHint>
      </div>
      <select
        id={`${id}-type`}
        value={value.google_service_type_id}
        onChange={onChange}
        disabled={!googleTypes.length && !chosenMissing}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={`${id}-type-hint ${id}-type-note`}
        className={fieldControl}
      >
        <option value="">
          {__("Choose a service", "foundhint-local-seo")}
        </option>
        {chosenMissing ? (
          <option value={value.google_service_type_id}>
            {value.name || value.google_service_type_id}
          </option>
        ) : null}
        {offered.map((type) => (
          <option key={type.id} value={type.id}>
            {type.label}
          </option>
        ))}
      </select>
      <span
        id={`${id}-type-note`}
        role={invalid ? "alert" : undefined}
        className={cn(
          "fhint:text-[13px]",
          invalid && googleTypes.length ? errorText : "fhint:text-muted-strong",
          !invalid && googleTypes.length && "fhint:sr-only",
        )}
      >
        {googleTypes.length
          ? __(
              "Choose a service from the list, or switch to Custom name.",
              "foundhint-local-seo",
            )
          : __(
              "Google has no ready-made services for this listing’s categories, or they have not been read yet. Press Refresh from Google at the top of the page, or use a custom name.",
              "foundhint-local-seo",
            )}
      </span>
    </div>
  );
}

export default GoogleTypeField;
