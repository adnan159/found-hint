import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { help } from "../../styles";
import { SKIP_REASONS, fieldName } from "./labels";

/**
 * What is saved here but is not going to Google, each with the reason.
 */
export function SkippedList({ skipped }) {
  return (
    <div className="fhint:grid fhint:gap-1.5">
      <strong className="fhint:text-[13px]">
        {__("Not being sent", "foundhint-local-seo")}
      </strong>
      <ul className="fhint:m-0 fhint:grid fhint:list-none fhint:gap-1 fhint:p-0">
        {skipped.map((item) => (
          <li key={item.field} className={cn(help, "fhint:m-0")}>
            <strong className="fhint:text-foreground-soft">
              {fieldName(item.field)}:
            </strong>{" "}
            {SKIP_REASONS[item.reason]?.() ?? item.reason}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default SkippedList;
