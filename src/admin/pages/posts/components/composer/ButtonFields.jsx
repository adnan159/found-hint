import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { help } from "@/pages/profile/styles";
import { dialogInput } from "../../styles";
import { buttonOptions } from "../../lib/posts";
import LinkInput from "../LinkInput";
import Field, { invalidProps } from "./Field";

/** An update's or event's button, and where it goes. */
export function ButtonFields({ id, form, set, errors, website }) {
  const linked = form.cta_type && form.cta_type !== "call";

  return (
    <>
      <div className="fhint:grid fhint:gap-3 fhint:sm:grid-cols-2">
        <Field
          id={`${id}-cta_type`}
          title={__("Button", "foundhint-local-seo")}
          error={errors.cta_type}
        >
          <select
            id={`${id}-cta_type`}
            value={form.cta_type}
            onChange={(event) => set({ cta_type: event.target.value })}
            className={cn(dialogInput, "fhint:pr-8!")}
          >
            {buttonOptions().map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        {linked ? (
          <Field
            id={`${id}-cta_url`}
            title={__("Button link", "foundhint-local-seo")}
            required
            error={errors.cta_url}
          >
            <LinkInput
              id={`${id}-cta_url`}
              website={website}
              value={form.cta_url}
              onChange={(cta_url) => set({ cta_url })}
              {...invalidProps(id, "cta_url", errors)}
            />
          </Field>
        ) : null}
      </div>
      {form.cta_type === "call" ? (
        <span className={help}>
          {__(
            "The button calls the phone number on your Google profile.",
            "foundhint-local-seo",
          )}
        </span>
      ) : null}
    </>
  );
}

export default ButtonFields;
