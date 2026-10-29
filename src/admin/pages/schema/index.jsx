import { Skeleton } from "@/components/ui/skeleton";
import RequestError from "@/components/RequestError";
import useSelectedLocation from "@/hooks/useSelectedLocation";
import { hasPro } from "@/lib/pro";
import { useGetSchemaQuery } from "@/store/api/schemaApi";
import {
  useGetBusinessSchemaQuery,
  useGetSchemaStateQuery,
} from "@/store/api/schemaManagerApi";
import ConnectGoogleNotice from "./components/page/ConnectGoogleNotice";
import SchemaHeader from "./components/page/SchemaHeader";
import TabBar from "./components/page/TabBar";
import TabPanel from "./components/page/TabPanel";
import UnsavedDialog from "./components/page/UnsavedDialog";
import useLocationBranches from "./hooks/useLocationBranches";
import useSchemaTab from "./hooks/useSchemaTab";
import useUnsavedGuard from "./hooks/useUnsavedGuard";
import { tabSummaries } from "./lib/tabSummaries";

/**
 * Schema — the Schema Manager (docs/SCHEMA-PLAN.md).
 *
 * Five tabs: Business, Location, Service, Website structure, Settings. With
 * FoundHint Pro serving `schema.business`, the Business tab is live; the
 * others arrive step by step. Without Pro, the same screen is shown locked,
 * filled with the markup the free plugin already prints.
 *
 * This file wires the page together; the parts live in `hooks/` (open tab,
 * branches, unsaved changes), `lib/summaries` and `components/`.
 */
export default function SchemaPage() {
  const plan = {
    business: hasPro("schema.business"),
    locations: hasPro("schema.locations"),
    services: hasPro("schema.services"),
    live: hasPro("schema.output"),
  };

  // One location for the whole admin: the bar at the top of every page.
  // The Business tab is the main location; the Location tab follows the
  // branch chosen there, and choosing a branch here switches the bar too.
  const { locationId, current, choose } = useSelectedLocation();
  const { tab, go } = useSchemaTab(locationId);
  const unsaved = useUnsavedGuard({ go, choose });
  const branches = useLocationBranches({
    pro: plan.locations,
    open: tab === "locations",
    locationId,
    choose,
  });

  const { data: free, error: freeError } = useGetSchemaQuery(0);
  const { data: state, error: stateError } = useGetSchemaStateQuery(undefined, {
    skip: !plan.business,
  });
  const { data: business, error: businessError } = useGetBusinessSchemaQuery(
    undefined,
    { skip: !plan.business },
  );

  const loading = !free || (plan.business && (!state || !business));
  const connectFirst = plan.business && state && !state.connected;

  return (
    <div className="fhint:grid fhint:min-w-0 fhint:grid-cols-[minmax(0,1fr)] fhint:gap-4">
      <SchemaHeader
        locked={!plan.business}
        syncedAt={state?.synced_at}
        locationId={tab === "locations" ? branches.branchId : 0}
        actions={!connectFirst}
      />

      <RequestError error={freeError ?? stateError ?? businessError} />

      {connectFirst ? (
        <ConnectGoogleNotice />
      ) : (
        <>
          <TabBar
            current={tab}
            summaries={tabSummaries({ plan, free, state, business })}
            dirty={unsaved.dirty}
            onPick={(key) => (key === tab ? null : unsaved.pickTab(key))}
          />

          {loading ? (
            <Skeleton className="fhint:h-[60vh] fhint:w-full" />
          ) : (
            <TabPanel
              tab={tab}
              plan={plan}
              free={free}
              business={business}
              branches={branches}
              locationId={locationId}
              branchName={
                locationId ? current?.business_name || current?.name : ""
              }
              unsaved={unsaved}
            />
          )}
        </>
      )}

      <UnsavedDialog
        open={unsaved.asking}
        onStay={unsaved.stay}
        onDiscard={unsaved.discard}
        onSave={unsaved.save}
      />
    </div>
  );
}
