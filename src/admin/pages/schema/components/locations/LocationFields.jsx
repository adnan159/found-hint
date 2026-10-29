import { cn } from "cn";
import { LOCATION_GROUPS } from "../../lib/location";
import FieldRow from "../field/FieldRow";
import { groupHead } from "../styles";
import BranchGroupFields from "./BranchGroupFields";

const GROUP_HEAD = cn(
  groupHead,
  "fhint:col-span-full fhint:m-0 fhint:mt-3 fhint:border-t fhint:border-t-border fhint:pt-2.5",
);

/**
 * The Location tab's fields, group by group. The Branch group also holds
 * what the branch is part of, and its sister branches.
 *
 * @param {Object}   props
 * @param {Object[]} props.fields  The branch's saved fields.
 * @param {Object}   props.draft   From `useOverrideDraft`.
 * @param {boolean}  props.locked  Read-only.
 * @param {string[]} props.missing Required fields still empty.
 * @param {Object}   props.errors  Server errors by field key.
 * @param {Object}   props.group   `{ parent, parentName, sisters,
 *                                 onParent }` for the Branch group.
 */
export function LocationFields({
  fields,
  draft,
  locked,
  missing,
  errors,
  group,
}) {
  return (
    <div className="fhint:grid fhint:grid-cols-[repeat(auto-fill,minmax(min(100%,230px),1fr))] fhint:gap-4 fhint:px-5 fhint:pt-1 fhint:pb-[18px]">
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
              onEdit={() => draft.edit(field.key)}
              onReset={() => draft.reset(field.key)}
              onChange={(next) => draft.override(field.key, next)}
            />
          )),
        key === "branch" ? (
          <BranchGroupFields key="group" locked={locked} {...group} />
        ) : null,
      ])}
    </div>
  );
}

export default LocationFields;
