import { __, sprintf } from "@wordpress/i18n";
import { cn } from "cn";
import { caption, chip, input, label, muted } from "../styles";

const PARENT_ID = "fhint-location-parent";

/**
 * The branch's place in the group: what it is part of
 * (parentOrganization), and the other branches in it.
 */
export function BranchGroupFields({
  parent,
  parentName,
  sisters,
  locked,
  onParent,
}) {
  return (
    <>
      <div className="fhint:grid fhint:min-w-0 fhint:content-start fhint:gap-1.5">
        <label htmlFor={PARENT_ID} className={label}>
          {__("Part of", "foundhint-local-seo")}
        </label>
        <select
          id={PARENT_ID}
          value={parent}
          disabled={locked}
          onChange={(event) => onParent(event.target.value)}
          aria-describedby={`${PARENT_ID}-hint`}
          className={cn(input(locked ? "locked" : "open"), "fhint:pr-8!")}
        >
          <option value="business">
            {sprintf(
              /* translators: %s: the business name. */
              __("%s (Business schema)", "foundhint-local-seo"),
              parentName,
            )}
          </option>
          <option value="none">
            {__("Not part of a group", "foundhint-local-seo")}
          </option>
        </select>
        <code id={`${PARENT_ID}-hint`} className={caption}>
          parentOrganization
        </code>
      </div>

      <div className="fhint:grid fhint:min-w-0 fhint:content-start fhint:gap-1.5">
        <span className={label}>
          {__("Sister branches", "foundhint-local-seo")}
        </span>
        <div className="fhint:flex fhint:flex-wrap fhint:gap-1.5">
          {sisters?.length ? (
            sisters.map((sister) => (
              <span
                key={sister}
                className={cn(chip(false), "fhint:cursor-default")}
              >
                {sister}
              </span>
            ))
          ) : (
            <span className={muted}>
              {parent === "business"
                ? __("No other branch in the group.", "foundhint-local-seo")
                : __("Not part of a group.", "foundhint-local-seo")}
            </span>
          )}
        </div>
      </div>
    </>
  );
}

export default BranchGroupFields;
