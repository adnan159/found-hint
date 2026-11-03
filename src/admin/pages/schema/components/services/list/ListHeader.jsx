import { __, sprintf } from "@wordpress/i18n";
import { cn } from "cn";
import { PlusIcon, WrenchIcon } from "lucide-react";
import {
  muted,
  panelChip,
  panelHeader,
  panelTitle,
  primaryAction,
} from "../../styles";

export const LIST_TITLE_ID = "fhint-schema-services-title";

/**
 * The list card's title bar, built like a Business Profile section: the
 * icon, "Services" (and the branch they belong to), how many are on, and
 * Add a service — with the plan's count when the limit is reached.
 */
export function ListHeader({
  locked,
  canAdd,
  limits,
  branchName,
  active,
  inactive,
  onAdd,
}) {
  return (
    <div className={panelHeader}>
      <span
        aria-hidden="true"
        className="fhint:grid fhint:size-5.5 fhint:flex-none fhint:place-items-center fhint:text-muted-strong"
      >
        <WrenchIcon className="fhint:size-4" />
      </span>
      <span className="fhint:grid fhint:min-w-0 fhint:flex-[1_1_220px] fhint:gap-1">
        <span className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2">
          <h2 id={LIST_TITLE_ID} className={panelTitle}>
            {__("Services", "foundhint-local-seo")}
          </h2>
          {branchName ? <span className={panelChip}>{branchName}</span> : null}
        </span>
        <span className={muted}>
          {sprintf(
            /* translators: 1: active services, 2: inactive services. */
            __("%1$d active · %2$d inactive", "foundhint-local-seo"),
            active,
            inactive,
          )}
        </span>
      </span>
      {locked ? null : (
        <span className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2">
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
            className={cn(primaryAction)}
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
