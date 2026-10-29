import { useState } from "react";
import { __ } from "@wordpress/i18n";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "cn";
import Hint from "@/components/Hint";
import { focus } from "@/pages/profile/styles";
import { currencyOptions, pricingSummary } from "../../../lib/service";
import { label, muted } from "../../styles";
import { sectionNumber } from "./EditorSection";
import { FieldError } from "./FieldError";

/**
 * 05 Optional details, folded away with the price summed up in a line:
 * pricing model, price (or a range) and currency.
 */
export function OptionalDetails({ form }) {
  const { values, set, locked, errors, field, control } = form;
  const [open, setOpen] = useState(false);
  const pricing = values.pricing;
  const priced = pricing.model !== "none";
  const setPricing = (changes) => set({ pricing: { ...pricing, ...changes } });

  return (
    <section className="fhint:border-t fhint:border-t-border">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={field("optional")}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "fhint:flex fhint:w-full fhint:cursor-pointer fhint:items-center fhint:gap-2 fhint:border-0 fhint:bg-transparent fhint:px-5 fhint:py-4 fhint:text-left",
          focus,
        )}
      >
        <span className={sectionNumber}>05</span>
        <strong className="fhint:text-[14px]">
          {__("Optional details", "foundhint-local-seo")}
        </strong>
        <span className={cn(muted, "fhint:flex-1")}>
          {pricingSummary(pricing)}
        </span>
        <ChevronDownIcon
          aria-hidden="true"
          className={cn(
            "fhint:size-4 fhint:transition-transform",
            open && "fhint:rotate-180",
          )}
        />
      </button>

      {open ? (
        <div
          id={field("optional")}
          className="fhint:grid fhint:grid-cols-[repeat(auto-fill,minmax(min(100%,180px),1fr))] fhint:gap-4 fhint:px-5 fhint:pb-4"
        >
          <div className="fhint:grid fhint:content-start fhint:gap-1.5">
            <span className="fhint:flex fhint:items-center fhint:gap-1.5">
              <label htmlFor={field("pricing")} className={label}>
                {__("Pricing", "foundhint-local-seo")}
              </label>
              <Hint
                about={__("Pricing", "foundhint-local-seo")}
                text={__(
                  "Only publish a price you would honour. The price is shared with your Business Profile's service list.",
                  "foundhint-local-seo",
                )}
              />
            </span>
            <select
              id={field("pricing")}
              value={pricing.model}
              disabled={locked}
              onChange={(event) => setPricing({ model: event.target.value })}
              className={cn(control("pricing"), "fhint:pr-8!")}
            >
              <option value="none">
                {__("No price", "foundhint-local-seo")}
              </option>
              <option value="fixed">
                {__("Fixed price", "foundhint-local-seo")}
              </option>
              <option value="from">
                {__("Starting at", "foundhint-local-seo")}
              </option>
              <option value="range">
                {__("Price range", "foundhint-local-seo")}
              </option>
            </select>
          </div>

          {priced ? (
            <div className="fhint:grid fhint:content-start fhint:gap-1.5">
              <label htmlFor={field("price")} className={label}>
                {pricing.model === "range"
                  ? __("From", "foundhint-local-seo")
                  : pricing.model === "from"
                    ? __("Starting price", "foundhint-local-seo")
                    : __("Price", "foundhint-local-seo")}
              </label>
              <input
                id={field("price")}
                inputMode="decimal"
                value={pricing.price}
                disabled={locked}
                onChange={(event) => setPricing({ price: event.target.value })}
                aria-invalid={Boolean(errors.price)}
                className={control("price")}
              />
              <FieldError messages={errors.price} />
            </div>
          ) : null}

          {pricing.model === "range" ? (
            <div className="fhint:grid fhint:content-start fhint:gap-1.5">
              <label htmlFor={field("max")} className={label}>
                {__("Up to", "foundhint-local-seo")}
              </label>
              <input
                id={field("max")}
                inputMode="decimal"
                value={pricing.max}
                disabled={locked}
                onChange={(event) => setPricing({ max: event.target.value })}
                aria-invalid={Boolean(errors.price_max)}
                className={control("price_max")}
              />
              <FieldError messages={errors.price_max} />
            </div>
          ) : null}

          {priced ? (
            <div className="fhint:grid fhint:content-start fhint:gap-1.5">
              <label htmlFor={field("currency")} className={label}>
                {__("Currency", "foundhint-local-seo")}
              </label>
              <select
                id={field("currency")}
                value={pricing.currency}
                disabled={locked}
                onChange={(event) =>
                  setPricing({ currency: event.target.value })
                }
                className={cn(control("currency"), "fhint:pr-8!")}
              >
                {currencyOptions(pricing.currency).map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
              <FieldError messages={errors.currency} />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export default OptionalDetails;
