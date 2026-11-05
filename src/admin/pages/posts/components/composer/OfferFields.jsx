import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { dialogInput } from "../../styles";
import LinkInput from "../LinkInput";
import Field, { invalidProps } from "./Field";

/** An offer's coupon code, redeem link and terms — all optional. */
export function OfferFields({ id, form, set, errors, website }) {
  return (
    <>
      <div className="fhint:grid fhint:gap-3 fhint:sm:grid-cols-2">
        <Field
          id={`${id}-coupon_code`}
          title={__("Coupon code (optional)", "foundhint-local-seo")}
          error={errors.coupon_code}
        >
          <input
            id={`${id}-coupon_code`}
            value={form.coupon_code}
            onChange={(event) => set({ coupon_code: event.target.value })}
            {...invalidProps(id, "coupon_code", errors)}
            placeholder={__("e.g. SMILE20", "foundhint-local-seo")}
            className={dialogInput}
          />
        </Field>
        <Field
          id={`${id}-redeem_url`}
          title={__("Link to redeem (optional)", "foundhint-local-seo")}
          error={errors.redeem_url}
        >
          <LinkInput
            id={`${id}-redeem_url`}
            website={website}
            value={form.redeem_url}
            onChange={(redeem_url) => set({ redeem_url })}
            {...invalidProps(id, "redeem_url", errors)}
          />
        </Field>
      </div>
      <Field
        id={`${id}-terms`}
        title={__("Terms and conditions (optional)", "foundhint-local-seo")}
        error={errors.terms}
      >
        <textarea
          id={`${id}-terms`}
          rows={2}
          value={form.terms}
          onChange={(event) => set({ terms: event.target.value })}
          {...invalidProps(id, "terms", errors)}
          placeholder={__(
            "e.g. New patients only. One per person.",
            "foundhint-local-seo",
          )}
          className={cn(dialogInput, "fhint:resize-y")}
        />
      </Field>
    </>
  );
}

export default OfferFields;
