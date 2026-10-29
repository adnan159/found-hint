import { __, sprintf } from "@wordpress/i18n";
import { PlusIcon } from "lucide-react";
import Hint from "@/components/Hint";
import { muted, panelHeader, panelTitle, primaryAction } from "../../styles";

export const LIST_TITLE_ID = "fhint-schema-services-title";

/**
 * The list's heading, and Add a service — with the plan's count when the
 * limit is reached.
 */
export function ListHeader({ locked, canAdd, limits, onAdd }) {
  return (
    <div className={panelHeader}>
      <span className="fhint:flex fhint:min-w-0 fhint:flex-[1_1_260px] fhint:items-center fhint:gap-2">
        <h2 id={LIST_TITLE_ID} className={panelTitle}>
          {__("Service schema", "foundhint-local-seo")}
        </h2>
        <Hint
          about={__("Service schema", "foundhint-local-seo")}
          text={__(
            "Each service you offer, linked to the business or branch that provides it. It never creates a second business.",
            "foundhint-local-seo",
          )}
        />
      </span>
      {locked ? null : (
        <span className="fhint:flex fhint:items-center fhint:gap-2">
          {!canAdd && limits ? (
            <span className={muted}>
              {sprintf(
                /* translators: 1: services used, 2: plan limit. */
                __("%1$d of %2$d on your plan", "foundhint-local-seo"),
                limits.used,
                limits.limit,
              )}
            </span>
          ) : null}
          <button
            type="button"
            onClick={onAdd}
            disabled={!canAdd}
            className={primaryAction}
          >
            <PlusIcon aria-hidden="true" className="fhint:size-4" />
            {__("Add a service", "foundhint-local-seo")}
          </button>
        </span>
      )}
    </div>
  );
}

export default ListHeader;
