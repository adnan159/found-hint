import { LOCATION_FULL_ROW, LOCATION_GROUPS } from "../../lib/location";
import FieldRow from "../field/FieldRow";
import FieldGroup from "../shared/FieldGroup";

// Three columns; the address (city to longitude) two.
const grid = (key) =>
  key === "address" ? "fhint:@lg:grid-cols-2" : "fhint:@lg:grid-cols-3";

/**
 * The branch's fields, one bordered card per group: business
 * information, address, hours and reach, branch code. Its page (url) is
 * chosen in 01 Location page, so its field is not shown here.
 *
 * @param {Object}   props
 * @param {Object[]} props.fields  The branch's saved fields.
 * @param {Object}   props.draft   From `useOverrideDraft`.
 * @param {boolean}  props.locked  Read-only.
 * @param {string[]} props.missing Required fields still empty.
 * @param {Object}   props.errors  Server errors by field key.
 */
export function LocationFields({ fields, draft, locked, missing, errors }) {
  return (
    <div className="fhint:@container">
      <div className="fhint:grid fhint:gap-4">
        {LOCATION_GROUPS.map(([key, title]) => {
          const inGroup = fields.filter((field) => field.group === key);

          return inGroup.length ? (
            <FieldGroup key={key} group={key} title={title()} grid={grid(key)}>
              {inGroup.map((field) => (
                <FieldRow
                  key={field.key}
                  field={draft.source(field)}
                  value={draft.value(field)}
                  editing={draft.isEditing(field.key)}
                  locked={locked}
                  missing={missing.includes(field.key)}
                  visitMode="storefront"
                  error={errors[field.key]}
                  scope="location"
                  fullRow={LOCATION_FULL_ROW.includes(field.key)}
                  onEdit={() => draft.edit(field.key)}
                  onReset={() => draft.reset(field.key)}
                  onChange={(next) => draft.override(field.key, next)}
                />
              ))}
            </FieldGroup>
          ) : null;
        })}
      </div>
    </div>
  );
}

export default LocationFields;
