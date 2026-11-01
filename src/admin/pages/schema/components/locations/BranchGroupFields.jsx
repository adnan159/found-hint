import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { chip, label, muted } from "../styles";

/**
 * The other branches in this branch's group. What it is part of
 * (parentOrganization) is chosen in "03 Parent business" above the fields.
 */
export function BranchGroupFields({ parent, sisters }) {
  return (
    <>
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
