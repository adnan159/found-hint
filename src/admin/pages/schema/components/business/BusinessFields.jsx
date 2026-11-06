import { __, sprintf } from "@wordpress/i18n";
import { cn } from "cn";
import { BUSINESS_GROUPS, STOREFRONT_ONLY } from "../../lib/business";
import FieldRow from "../field/FieldRow";
import FieldGroup from "../shared/FieldGroup";
import { muted } from "../styles";
import ExtraField from "./ExtraField";
import VisitModePicker from "./VisitModePicker";

// Most groups: as many columns as fit. The address: two.
const AUTO_GRID =
  "fhint:grid-cols-[repeat(auto-fill,minmax(min(100%,230px),1fr))]";
const ADDRESS_GRID = "fhint:sm:grid-cols-2";

// Fields that take a whole row: all of Business information, and the long
// address lines.
const fullRow = (group, key) =>
  group === "info" || ["street_address", "map_url"].includes(key);

/**
 * The Business tab's fields, one bordered card per group, then the details
 * specific to the business type.
 *
 * @param {Object}   props
 * @param {Object[]} props.fields     The fields to show.
 * @param {Object}   props.draft      From `useOverrideDraft`.
 * @param {boolean}  props.locked     Read-only.
 * @param {string[]} props.missing    Required fields still empty.
 * @param {string}   props.visitMode  `storefront` or `service_area`.
 * @param {boolean}  props.organization The Organization kind: its address is
 *                                    optional and has no visit mode.
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
  organization = false,
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
    <div className="fhint:grid fhint:gap-4">
      {BUSINESS_GROUPS.map(([group, title]) => {
        const inGroup = fields.filter((field) => field.group === group);

        if (!inGroup.length) {
          return null;
        }

        if (group !== "address") {
          return (
            <FieldGroup
              key={group}
              group={group}
              title={title()}
              grid={AUTO_GRID}
            >
              {inGroup.map(row(group))}
            </FieldGroup>
          );
        }

        // The street and the map link take a row; the rest sits two to a row.
        return (
          <FieldGroup
            key={group}
            group={group}
            title={title()}
            grid={ADDRESS_GRID}
          >
            {organization ? (
              <p className={cn(muted, "fhint:col-span-full fhint:m-0")}>
                {__(
                  "Optional. Fill in only what you want published — a city and country is enough.",
                  "foundhint-local-seo",
                )}
              </p>
            ) : (
              <VisitModePicker
                value={visitMode}
                locked={locked}
                onChange={onVisitMode}
              />
            )}
            {inGroup
              .filter(
                (field) =>
                  organization ||
                  !(
                    visitMode === "service_area" &&
                    STOREFRONT_ONLY.includes(field.key)
                  ),
              )
              .map(row(group))}
          </FieldGroup>
        );
      })}

      {extras?.fields.length ? (
        <FieldGroup
          group="extras"
          title={sprintf(
            /* translators: %s: the business type, e.g. "Dental practice". */
            __("Details for %s", "foundhint-local-seo"),
            extras.typeLabel,
          )}
          grid={AUTO_GRID}
        >
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
        </FieldGroup>
      ) : null}
    </div>
  );
}

export default BusinessFields;
