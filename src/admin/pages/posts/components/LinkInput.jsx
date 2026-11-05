import { __ } from "@wordpress/i18n";
import { GlobeIcon } from "lucide-react";
import { cn } from "cn";
import { focus } from "@/pages/profile/styles";
import { dialogInput } from "../styles";

/**
 * A link field with a globe button at its end that fills in the listing's
 * website. The button is disabled when the listing has no website.
 *
 * @param {Object}   props
 * @param {string}   props.website  The listing's website.
 * @param {Function} props.onChange Called with the new link.
 */
export function LinkInput({ website, value, onChange, ...input }) {
  const label = website
    ? __("Use my website address", "foundhint-local-seo")
    : __("No website on your Google profile", "foundhint-local-seo");

  return (
    <div className="fhint:flex fhint:min-w-0">
      <input
        type="url"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="https://"
        className={cn(dialogInput, "fhint:flex-1")}
        {...input}
      />
      <button
        type="button"
        onClick={() => onChange(website)}
        disabled={!website}
        title={label}
        className={cn(
          "fhint:grid fhint:flex-none fhint:cursor-pointer fhint:place-items-center fhint:border fhint:border-l-0 fhint:border-input fhint:bg-card fhint:px-3 fhint:text-muted-strong fhint:hover:bg-muted fhint:hover:text-foreground fhint:disabled:cursor-not-allowed fhint:disabled:text-muted-foreground fhint:disabled:hover:bg-card",
          focus,
        )}
      >
        <GlobeIcon aria-hidden="true" className="fhint:size-4" />
        <span className="fhint:sr-only">{label}</span>
      </button>
    </div>
  );
}

export default LinkInput;
