import { __, sprintf } from "@wordpress/i18n";

/**
 * The line over the rows: whose services these are, and how many are on.
 */
export function ListSummary({ branchName, active, inactive }) {
  return (
    <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2.5">
      <span className="fhint:text-[13px] fhint:font-bold">
        {__("Services offered", "foundhint-local-seo")}
      </span>
      {branchName ? (
        <span className="fhint:text-[12.5px] fhint:font-bold fhint:text-[#D8521F]">
          {branchName}
        </span>
      ) : null}
      <span className="fhint:text-[12px] fhint:text-[#625e5e]">
        {sprintf(
          /* translators: 1: active services, 2: inactive services. */
          __("%1$d active · %2$d inactive", "foundhint-local-seo"),
          active,
          inactive,
        )}
      </span>
    </div>
  );
}

export default ListSummary;
