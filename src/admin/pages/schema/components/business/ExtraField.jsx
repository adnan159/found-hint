import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { BADGES, caption, fieldError, input, label, pill } from "../styles";

/**
 * One detail specific to the business type (a dentist's accepted
 * insurance, a restaurant's cuisine): yes/no, a choice, a time or text.
 */
export function ExtraField({ extra, value, locked, error, onChange }) {
  const id = `fhint-extra-${extra.key}`;
  const tone = error ? "missing" : locked ? "locked" : "open";

  return (
    <div className="fhint:grid fhint:min-w-0 fhint:content-start fhint:gap-1.5">
      <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2">
        <label htmlFor={id} className={label}>
          {extra.label}
        </label>
        <span className={cn(pill, BADGES.optional)}>
          {__("Optional", "foundhint-local-seo")}
        </span>
      </div>
      {extra.kind === "bool" ? (
        <select
          id={id}
          value={value === true ? "yes" : value === false ? "no" : ""}
          disabled={locked}
          onChange={(event) =>
            onChange(
              event.target.value === "" ? "" : event.target.value === "yes",
            )
          }
          className={cn(input(locked ? "locked" : "open"), "fhint:pr-8!")}
        >
          <option value="">{__("Not set", "foundhint-local-seo")}</option>
          <option value="yes">{__("Yes", "foundhint-local-seo")}</option>
          <option value="no">{__("No", "foundhint-local-seo")}</option>
        </select>
      ) : extra.kind === "enum" ? (
        <select
          id={id}
          value={value ?? ""}
          disabled={locked}
          onChange={(event) => onChange(event.target.value)}
          className={cn(input(locked ? "locked" : "open"), "fhint:pr-8!")}
        >
          <option value="">{__("Not set", "foundhint-local-seo")}</option>
          {extra.options.map((option) => (
            <option key={option} value={option}>
              {option.replace(/([a-z])([A-Z])/g, "$1 $2")}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          type={
            extra.kind === "time"
              ? "time"
              : extra.kind === "url"
                ? "url"
                : "text"
          }
          value={value ?? ""}
          readOnly={locked}
          tabIndex={locked ? -1 : undefined}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          className={input(tone)}
        />
      )}
      <code className={caption}>{extra.key}</code>
      {error ? (
        <span role="alert" className={fieldError}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

export default ExtraField;
