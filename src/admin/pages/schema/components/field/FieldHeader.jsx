import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { badgeTone } from "../../lib/field";
import { badgeLabel, fieldLabel } from "../../lib/schema";
import { BADGES, label, linkAction, pill } from "../styles";

/**
 * The line above a field: its label, its badges (requirement, From Google
 * / Edited here) and the Edit ↔ Use Google's value action.
 */
export function FieldHeader({
  id,
  field,
  scope,
  status,
  visitMode,
  onEdit,
  onReset,
}) {
  const name = fieldLabel(field.key, scope);
  const requirement = badgeLabel(field.badge, visitMode);

  return (
    <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2">
      {/* The hours are a list, not a control: nothing to point at. */}
      <label
        htmlFor={field.input === "hours" ? undefined : id}
        className={label}
      >
        {name}
      </label>
      {requirement ? (
        <span className={cn(pill, BADGES[badgeTone(field.badge, visitMode)])}>
          {requirement}
        </span>
      ) : null}
      {status.fromGoogle && !status.edited ? (
        <span className={cn(pill, BADGES.google)}>
          {__("From Google", "foundhint-local-seo")}
        </span>
      ) : null}
      {status.edited && field.gbp ? (
        <span className={cn(pill, BADGES.edited)}>
          {__("Edited here", "foundhint-local-seo")}
        </span>
      ) : null}
      {status.canSwitch ? (
        <button
          type="button"
          onClick={status.edited ? onReset : onEdit}
          className={cn(linkAction, "fhint:ml-auto")}
        >
          {status.edited ? (
            __("Use Google's value", "foundhint-local-seo")
          ) : (
            <>
              {__("Edit", "foundhint-local-seo")}
              <span className="fhint:sr-only">{` ${name}`}</span>
            </>
          )}
        </button>
      ) : null}
    </div>
  );
}

export default FieldHeader;
