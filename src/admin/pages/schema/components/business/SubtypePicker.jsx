import { useId } from "react";
import { __, sprintf } from "@wordpress/i18n";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { useGetSchemaTypesQuery } from "@/store/api/schemaManagerApi";
import { BADGES, label, muted, pill } from "../styles";

/**
 * "Business subtype": a searchable list of local business types, each with
 * its friendly name and its Schema.org type, pre-matched from the Google
 * category.
 */
export function SubtypePicker({
  type,
  typeLabel,
  matchedFrom,
  locked,
  onPick,
}) {
  const id = useId();
  const { data: types = [] } = useGetSchemaTypesQuery(undefined, {
    skip: locked,
  });
  const options = types.filter((option) => option.type !== "Organization");
  const selected =
    options.find((option) => option.type === type) ??
    (type ? { type, label: typeLabel || type } : null);

  return (
    <div className="fhint:grid fhint:gap-1.5 fhint:border-b fhint:border-b-border fhint:px-5 fhint:py-4">
      <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2">
        <label htmlFor={id} className={label}>
          {__("Business subtype", "foundhint-local-seo")}
        </label>
        <span className={`${pill} ${BADGES.fh}`}>
          {__("Required", "foundhint-local-seo")}
        </span>
      </div>

      {locked ? (
        <div className="fhint:flex fhint:items-center fhint:gap-2.5 fhint:border fhint:border-border fhint:bg-muted fhint:px-3 fhint:py-[9px] fhint:text-[13.5px]">
          <span className="fhint:min-w-0 fhint:flex-1">{typeLabel}</span>
          <code className="fhint:bg-notice fhint:px-1.5 fhint:py-px fhint:font-mono fhint:text-[11.5px] fhint:text-notice-foreground">
            {type}
          </code>
        </div>
      ) : (
        <Combobox
          items={options}
          value={selected}
          onValueChange={(item) => item && onPick(item.type)}
          itemToStringLabel={(item) => item?.label ?? ""}
          isItemEqualToValue={(a, b) => a?.type === b?.type}
        >
          <ComboboxInput
            id={id}
            placeholder={__("Search business types", "foundhint-local-seo")}
            className="fhint:w-full"
          />
          <ComboboxContent>
            <ComboboxEmpty>
              {__(
                "No match. Try a broader word, or pick Local business.",
                "foundhint-local-seo",
              )}
            </ComboboxEmpty>
            <ComboboxList>
              {(item) => (
                <ComboboxItem key={item.type} value={item}>
                  <span className="fhint:min-w-0 fhint:flex-1">
                    {item.label}
                  </span>
                  <code className="fhint:font-mono fhint:text-[11.5px] fhint:text-muted-foreground">
                    {item.type}
                  </code>
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      )}

      <span className={muted}>
        {matchedFrom
          ? sprintf(
              /* translators: %s: the Google category. */
              __(
                "Matched from your Google category: %s. Not on the list? Pick the closest broader type.",
                "foundhint-local-seo",
              ),
              matchedFrom,
            )
          : __(
              "Not on the list? Pick the closest broader type.",
              "foundhint-local-seo",
            )}
      </span>
    </div>
  );
}

export default SubtypePicker;
