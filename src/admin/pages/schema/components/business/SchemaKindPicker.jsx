import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { BADGES, card, label, pill } from "../styles";

const KINDS = () => [
  {
    key: "organization",
    title: __("Organization", "foundhint-local-seo"),
    scope: __("Business-wide", "foundhint-local-seo"),
    purpose: __(
      "For the overall company or brand. No address or opening hours needed.",
      "foundhint-local-seo",
    ),
    example: __(
      "e.g. a parent brand that owns five plumbing locations.",
      "foundhint-local-seo",
    ),
  },
  {
    key: "localbusiness",
    title: __("LocalBusiness / subtype", "foundhint-local-seo"),
    scope: __("Location-specific", "foundhint-local-seo"),
    purpose: __(
      "For a business customers visit or that serves a local area, with address, hours and category.",
      "foundhint-local-seo",
    ),
    example: __(
      "e.g. a dental clinic with its own address and opening hours.",
      "foundhint-local-seo",
    ),
  },
];

/**
 * Schema type: an Organization (the brand) or a LocalBusiness (a place).
 */
export function SchemaKindPicker({ value, locked, onChange }) {
  return (
    <fieldset className="fhint:m-0 fhint:grid fhint:gap-2.5 fhint:border-0 fhint:border-b fhint:border-b-border fhint:px-5 fhint:py-4">
      <legend
        className={cn(
          label,
          "fhint:float-left fhint:mb-1 fhint:w-full fhint:p-0",
        )}
      >
        {__("Schema type", "foundhint-local-seo")}
      </legend>
      <div className="fhint:grid fhint:grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] fhint:gap-2.5">
        {KINDS().map(({ key, title, scope, purpose, example }) => (
          <label
            key={key}
            className={cn(
              card(value === key),
              locked && "fhint:cursor-default",
            )}
          >
            <input
              type="radio"
              name="fhint-schema-kind"
              checked={value === key}
              disabled={locked}
              onChange={() => onChange(key)}
              // WordPress pulls every admin radio up 4px; 3px down sets it
              // level with the title's line, which the scope pill makes
              // taller than 20px.
              className="fhint:m-0! fhint:mt-[3px]! fhint:flex-none fhint:accent-primary"
            />
            <span className="fhint:grid fhint:min-w-0 fhint:gap-[5px]">
              <span className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2">
                <strong className="fhint:text-[14px] fhint:leading-5">
                  {title}
                </strong>
                <span className={cn(pill, BADGES.scope)}>{scope}</span>
              </span>
              <span className="fhint:text-[12.5px] fhint:leading-normal fhint:text-foreground-soft">
                {purpose}
              </span>
              <span className="fhint:text-[12.5px] fhint:leading-normal fhint:text-muted-strong">
                {example}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default SchemaKindPicker;
