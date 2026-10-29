import { __, sprintf } from "@wordpress/i18n";
import { cn } from "cn";
import { BUSINESS_GROUPS, STOREFRONT_ONLY } from "../../lib/business";
import FieldRow from "../field/FieldRow";
import { groupHead } from "../styles";
import ExtraField from "./ExtraField";
import VisitModePicker from "./VisitModePicker";

const GROUP_HEAD = cn(
  groupHead,
  "fhint:col-span-full fhint:m-0 fhint:border-t fhint:border-t-border fhint:pt-2.5",
);

// Fields that take a whole row: all of Business information, and the long
// address lines.
const fullRow = (group, key) =>
  group === "info" || ["street_address", "map_url"].includes(key);

/**
 * The Business tab's fields, group by group, then the details specific to
 * the business type.
 *
 * @param {Object}   props
 * @param {Object[]} props.fields     The fields to show.
 * @param {Object}   props.draft      From `useOverrideDraft`.
 * @param {boolean}  props.locked     Read-only.
 * @param {string[]} props.missing    Required fields still empty.
 * @param {string}   props.visitMode  `storefront` or `service_area`.
 * @param {Function} props.onVisitMode Change it.
 * @param {Object}   props.errors     Server errors by field key.
 * @param {Object[]} props.photos     The listing's photos, for the picker.
 * @param {Object}   props.extras     `{ fields, typeLabel, value(key),
 *                                    onChange(key, value) }`, or null.
 */
export function BusinessFields({
  fields,
  draft,
  locked,
  missing,
  visitMode,
  onVisitMode,
  errors,
  photos,
  extras,
}) {
  const row = (group) => (field) => (
    <FieldRow
      key={field.key}
      field={field}
      value={draft.value(field)}
      editing={draft.isEditing(field.key)}
      locked={locked}
      missing={missing.includes(field.key)}
      visitMode={visitMode}
      error={errors[field.key]}
      photos={photos}
      fullRow={fullRow(group, field.key)}
      onEdit={() => draft.edit(field.key)}
      onReset={() => draft.reset(field.key)}
      onChange={(next) => draft.override(field.key, next)}
    />
  );

  return (
    <div className="fhint:grid fhint:grid-cols-[repeat(auto-fill,minmax(min(100%,230px),1fr))] fhint:gap-4 fhint:px-5 fhint:pt-1 fhint:pb-[18px]">
      {BUSINESS_GROUPS.map(([group, title]) => {
        const inGroup = fields.filter((field) => field.group === group);

        if (!inGroup.length) {
          return null;
        }

        if (group !== "address") {
          return [
            <h3 key={`${group}-head`} className={GROUP_HEAD}>
              {title()}
            </h3>,
            ...inGroup.map(row(group)),
          ];
        }

        // The street and the map link take a row; the rest sits two to a
        // row, on its own grid so the other groups keep theirs.
        return [
          <h3 key="address-head" className={GROUP_HEAD}>
            {title()}
          </h3>,
          <VisitModePicker
            key="visit"
            value={visitMode}
            locked={locked}
            onChange={onVisitMode}
          />,
          <div
            key="address-fields"
            className="fhint:col-span-full fhint:grid fhint:grid-cols-1 fhint:gap-4 fhint:sm:grid-cols-2"
          >
            {inGroup
              .filter(
                (field) =>
                  !(
                    visitMode === "service_area" &&
                    STOREFRONT_ONLY.includes(field.key)
                  ),
              )
              .map(row(group))}
          </div>,
        ];
      })}

      {extras?.fields.length ? (
        <>
          <h3 className={GROUP_HEAD}>
            {sprintf(
              /* translators: %s: the business type, e.g. "Dental practice". */
              __("Details for %s", "foundhint-local-seo"),
              extras.typeLabel,
            )}
          </h3>
          {extras.fields.map((extra) => (
            <ExtraField
              key={extra.key}
              extra={extra}
              value={extras.value(extra.key)}
              locked={locked}
              error={errors[`extras.${extra.key}`]}
              onChange={(next) => extras.onChange(extra.key, next)}
            />
          ))}
        </>
      ) : null}
    </div>
  );
}

export default BusinessFields;
