import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import FieldHint from "./FieldHint";
import { fieldControl, fieldLabel, optionalText } from "./styles";

// Code and the sign shown beside it, as the design lists them.
const CURRENCIES = [
  ["USD", "$"],
  ["CAD", "$"],
  ["GBP", "£"],
  ["EUR", "€"],
  ["AUD", "$"],
  ["INR", "₹"],
  ["BDT", "৳"],
  ["AED", "د.إ"],
];

/**
 * An optional price: a currency and an amount.
 *
 * A currency this form does not list — one saved before, or read from Google
 * — is kept on offer, so opening the form never changes it.
 */
export function PriceField({ id, price, currency, onPrice, onCurrency }) {
  const currencies = CURRENCIES.some(([code]) => code === currency)
    ? CURRENCIES
    : [[currency, ""], ...CURRENCIES];

  return (
    <div className="fhint:grid fhint:gap-2.5">
      <div className="fhint:flex fhint:items-center fhint:gap-2">
        <label htmlFor={`${id}-price`} className={fieldLabel}>
          {__("Price", "foundhint-local-seo")}
        </label>
        <span className={optionalText}>
          {__("Optional", "foundhint-local-seo")}
        </span>
        <FieldHint id={`${id}-price-hint`}>
          {__(
            "Shown next to the service on Google. Leave it empty if the price depends on the visit.",
            "foundhint-local-seo",
          )}
        </FieldHint>
      </div>
      <div className="fhint:flex">
        <select
          value={currency}
          onChange={onCurrency}
          aria-label={__("Currency", "foundhint-local-seo")}
          className={cn(
            fieldControl,
            "fhint:w-[130px] fhint:flex-none fhint:border-r-0 fhint:bg-muted",
          )}
        >
          {currencies.map(([code, sign]) => (
            <option key={code} value={code}>
              {`${code} ${sign}`.trim()}
            </option>
          ))}
        </select>
        <input
          id={`${id}-price`}
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          value={price}
          onChange={onPrice}
          aria-describedby={`${id}-price-hint`}
          className={fieldControl}
        />
      </div>
    </div>
  );
}

export default PriceField;
