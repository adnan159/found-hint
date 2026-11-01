import { cn } from "cn";
import { LOCATION_FULL_ROW, LOCATION_GROUPS } from "../../lib/location";
import FieldRow from "../field/FieldRow";
import { groupHead } from "../styles";

const GROUP_HEAD = cn(
  groupHead,
  "fhint:col-span-full fhint:m-0 fhint:mt-3 fhint:border-t fhint:border-t-border fhint:pt-2.5",
);

/**
 * The branch's fields, group by group as the design shows them: business
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
      <div className="fhint:grid fhint:grid-cols-1 fhint:gap-4 fhint:px-5 fhint:pt-1 fhint:pb-[18px] fhint:@lg:grid-cols-3">
        {LOCATION_GROUPS.map(([key, title]) => [
          <h3 key={`${key}-head`} className={GROUP_HEAD}>
            {title()}
          </h3>,
          ...fields
            .filter((field) => field.group === key)
            .map((field) => (
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
            )),
        ])}
      </div>
    </div>
  );
}

export default LocationFields;
