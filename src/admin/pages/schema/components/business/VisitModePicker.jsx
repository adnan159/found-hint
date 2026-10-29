import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { card, label } from "../styles";

const MODES = () => [
  [
    "storefront",
    __("This address (storefront or office)", "foundhint-local-seo"),
  ],
  [
    "service_area",
    __("Their location (service area only)", "foundhint-local-seo"),
  ],
];

/**
 * Customers visit you at: a storefront address, or — a service-area
 * business — wherever they are.
 */
export function VisitModePicker({ value, locked, onChange }) {
  return (
    <fieldset className="fhint:col-span-full fhint:m-0 fhint:grid fhint:gap-2 fhint:border-0 fhint:p-0">
      <legend
        className={cn(
          label,
          "fhint:float-left fhint:mb-1 fhint:w-full fhint:p-0",
        )}
      >
        {__("Customers visit you at", "foundhint-local-seo")}
      </legend>
      <div className="fhint:flex fhint:flex-wrap fhint:gap-2">
        {MODES().map(([mode, text]) => (
          <label
            key={mode}
            className={cn(
              card(value === mode),
              "fhint:items-center fhint:py-2",
              locked && "fhint:cursor-default",
            )}
          >
            <input
              type="radio"
              name="fhint-visit-mode"
              checked={value === mode}
              disabled={locked}
              onChange={() => onChange(mode)}
              // WordPress pulls every admin radio up 4px.
              className="fhint:m-0! fhint:accent-[#FF6B35]"
            />
            <span className="fhint:text-[13px]">{text}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default VisitModePicker;
