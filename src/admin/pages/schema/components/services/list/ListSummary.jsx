import { __, sprintf } from "@wordpress/i18n";
import { muted } from "../../styles";

/**
 * The line over the rows: whose services these are, and how many are on.
 */
export function ListSummary({ branchName, active, inactive }) {
  return (
    <div className="fhint:flex fhint:flex-wrap fhint:items-baseline fhint:gap-2 fhint:border-b fhint:border-b-border fhint:px-5 fhint:py-2.5">
      <span className="fhint:text-[11.5px] fhint:font-bold fhint:tracking-[0.06em] fhint:text-muted-strong fhint:uppercase">
        {__("Services offered", "foundhint-local-seo")}
      </span>
      {branchName ? (
        <span className="fhint:text-[12.5px] fhint:font-bold">
          {branchName}
        </span>
      ) : null}
      <span className={muted}>
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
