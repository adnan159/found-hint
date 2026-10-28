import { useCallback, useEffect, useRef, useState } from "react";
import { __, _n, sprintf } from "@wordpress/i18n";
import { Link2Icon } from "lucide-react";
import { useSearchParams } from "react-router";
import { cn } from "cn";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/PageHeader";
import RequestError from "@/components/RequestError";
import { useLocationSelection } from "@/context/SelectedLocation";
import useSelectedLocation from "@/hooks/useSelectedLocation";
import { hasPro } from "@/lib/pro";
import { focus } from "@/pages/profile/styles";
import { useGetLocationsQuery } from "@/store/api/locationsApi";
import { useGetSchemaQuery } from "@/store/api/schemaApi";
import {
  useGetBusinessSchemaQuery,
  useGetLocationSchemaQuery,
  useGetLocationSchemasQuery,
  useGetSchemaStateQuery,
} from "@/store/api/schemaManagerApi";
import BusinessTab from "./components/BusinessTab";
import ComingTab from "./components/ComingTab";
import LocationTab from "./components/LocationTab";
import SchemaHeader from "./components/SchemaHeader";
import TabBar, { TABS } from "./components/TabBar";
import WhoPublishes from "./components/WhoPublishes";
import {
  lockedBusinessState,
  lockedLocationState,
  placementLabel,
} from "./lib/schema";

const dialogButton = cn(
  "fhint:cursor-pointer fhint:border fhint:border-[#bab6b6] fhint:bg-card fhint:px-3.5 fhint:py-2 fhint:text-[13px] fhint:font-bold",
  focus,
);

/**
 * Schema — the Schema Manager (docs/SCHEMA-PLAN.md).
 *
 * Five tabs: Business, Location, Service, Website structure, Settings. With
 * FoundHint Pro serving `schema.business`, the Business tab is live; the
 * others arrive step by step. Without Pro, the same screen is shown locked,
 * filled with the markup the free plugin already prints.
 */
export default function SchemaPage() {
  const pro = hasPro("schema.business");
  const proLocations = hasPro("schema.locations");
  const live = hasPro("schema.output");
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab");
  const tab = TABS.some(([key]) => key === requested) ? requested : "business";
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(null);
  const saveRef = useRef(null);

  const { data: free, error: freeError } = useGetSchemaQuery(0);
  const { data: state, error: stateError } = useGetSchemaStateQuery(undefined, {
    skip: !pro,
  });
  const { data: business, error: businessError } = useGetBusinessSchemaQuery(
    undefined,
    { skip: !pro },
  );

  const dirtyRef = useRef(false);
  const onDirtyChange = useCallback((next) => {
    dirtyRef.current = next;
    setDirty(next);
  }, []);

  // One location for the whole admin: the bar at the top of every page.
  // The Business tab is the main location; the Location tab follows the
  // branch chosen there, and choosing a branch here switches the bar too.
  const { locationId, choose } = useSelectedLocation();
  const { registerGuard } = useLocationSelection();

  const go = (key) => {
    setParams(key === "business" ? {} : { tab: key }, { replace: true });
  };

  // A switch in the bar with unsaved changes waits for Save / Discard / Stay.
  useEffect(
    () =>
      registerGuard((id) => {
        if (!dirtyRef.current) {
          return true;
        }

        setPending({ location: id });

        return false;
      }),
    [registerGuard],
  );

  // A branch chosen in the bar opens the Location tab; the main location
  // opens the Business tab. Other tabs are site-wide and stay where they are.
  const previousLocation = useRef(locationId);

  useEffect(() => {
    if (previousLocation.current === locationId) {
      return;
    }

    previousLocation.current = locationId;

    if (locationId && tab === "business") {
      go("locations");
    } else if (!locationId && tab === "locations") {
      go("business");
    }
  });

  // Branches: Premium's list, or (locked) every location but the main one.
  const { data: premiumBranches } = useGetLocationSchemasQuery(undefined, {
    skip: !proLocations || tab !== "locations",
  });
  const { data: freeLocations } = useGetLocationsQuery(undefined, {
    skip: proLocations || tab !== "locations",
  });
  const branches = proLocations
    ? (premiumBranches ?? [])
    : (freeLocations?.locations ?? [])
        .filter((location) => !location.is_primary)
        .map((location) => ({
          id: location.id,
          name: location.business_name || location.name,
          status:
            location.status === "permanently_closed" ? "inactive" : "active",
          pages: null,
        }));
  const branchId = branches.some((branch) => branch.id === locationId)
    ? locationId
    : 0;
  const { data: branchState } = useGetLocationSchemaQuery(branchId, {
    skip: !proLocations || !branchId || tab !== "locations",
  });
  const { data: freeBranch } = useGetSchemaQuery(branchId, {
    skip: proLocations || !branchId || tab !== "locations",
  });

  // A pill switches the bar; the guard above prompts on unsaved changes.
  const pickBranch = (id) => {
    if (id !== branchId) {
      choose(id);
    }
  };

  const pick = (key) => {
    if (key === tab) {
      return;
    }

    if (dirty) {
      setPending(key);
      return;
    }

    go(key);
  };

  const resolvePending = () => {
    if (pending && typeof pending === "object") {
      // Saved or discarded: nothing stands in the way any more.
      dirtyRef.current = false;
      choose(pending.location);
    } else if (pending) {
      go(pending);
    }

    setPending(null);
  };

  const soon = __("Coming in a later update", "foundhint-local-seo");
  const summaries = {
    business: pro
      ? business
        ? `${business.schema_kind === "organization" ? "Organization" : business.type} · ${placementLabel(business.placement)}`
        : "…"
      : free?.graph?.["@graph"]?.[0]?.["@type"]
        ? `${free.graph["@graph"][0]["@type"]} · ${placementLabel("every_page")}`
        : __("Pro", "foundhint-local-seo"),
    locations: proLocations
      ? state?.tabs?.locations
        ? `${sprintf(
            /* translators: %d: branches switched on. */
            _n(
              "%d branch",
              "%d branches",
              state.tabs.locations.branches,
              "foundhint-local-seo",
            ),
            state.tabs.locations.branches,
          )} · ${sprintf(
            /* translators: %d: pages the branches print on. */
            _n(
              "%d page",
              "%d pages",
              state.tabs.locations.pages,
              "foundhint-local-seo",
            ),
            state.tabs.locations.pages,
          )}`
        : "…"
      : pro
        ? soon
        : __("Pro", "foundhint-local-seo"),
    services: pro ? soon : __("Pro", "foundhint-local-seo"),
    website: pro ? soon : __("Pro", "foundhint-local-seo"),
    settings: __("Who publishes it", "foundhint-local-seo"),
  };

  const loading = !free || (pro && (!state || !business));
  const connectFirst = pro && state && !state.connected;

  return (
    <div className="fhint:grid fhint:min-w-0 fhint:grid-cols-[minmax(0,1fr)] fhint:gap-4">
      <PageHeader title={__("Schema", "foundhint-local-seo")} hidden />

      <RequestError error={freeError ?? stateError ?? businessError} />

      {connectFirst ? (
        <section className="fhint:grid fhint:justify-items-start fhint:gap-3 fhint:border fhint:border-[#e6e3e3] fhint:bg-card fhint:px-6 fhint:py-8">
          <h2 className="fhint:m-0 fhint:text-[18px] fhint:font-bold">
            {__(
              "Connect your Google Business Profile to set up schema",
              "foundhint-local-seo",
            )}
          </h2>
          <p className="fhint:m-0 fhint:max-w-[60ch] fhint:text-[13.5px] fhint:leading-relaxed fhint:text-[#444141]">
            {__(
              "Your schema is built from your Business Profile: name, address, phone and hours come from Google, and you can edit any of them for your website. Nothing changes on your site until you connect.",
              "foundhint-local-seo",
            )}
          </p>
          <a
            href="#/google"
            className={cn(
              dialogButton,
              "fhint:inline-flex fhint:items-center fhint:gap-2 fhint:border-0 fhint:bg-[#FF6B35] fhint:text-white fhint:no-underline",
            )}
          >
            <Link2Icon aria-hidden="true" className="fhint:size-4" />
            {__("Connect Google", "foundhint-local-seo")}
          </a>
        </section>
      ) : (
        <>
          <SchemaHeader
            locked={!pro}
            syncedAt={state?.synced_at}
            locationId={tab === "locations" ? branchId : 0}
          />

          <TabBar
            current={tab}
            summaries={summaries}
            dirty={dirty}
            onPick={pick}
          />

          {loading ? (
            <Skeleton className="fhint:h-[60vh] fhint:w-full" />
          ) : tab === "business" ? (
            <BusinessTab
              state={pro ? business : lockedBusinessState(free)}
              locked={!pro}
              live={live}
              onDirtyChange={onDirtyChange}
              saveRef={saveRef}
            />
          ) : tab === "locations" && (proLocations || !pro) ? (
            <LocationTab
              branches={branches}
              branchId={branchId}
              onBranch={pickBranch}
              state={
                proLocations
                  ? branchState
                  : freeBranch
                    ? lockedLocationState(freeBranch)
                    : null
              }
              locked={!proLocations}
              live={live}
              onDirtyChange={onDirtyChange}
              saveRef={saveRef}
            />
          ) : tab === "settings" ? (
            <WhoPublishes ownership={free.ownership ?? {}} />
          ) : (
            <ComingTab
              title={TABS.find(([key]) => key === tab)[1]()}
              body={
                {
                  locations: __(
                    "Describe each branch: its own address, phone, hours and page, linked to your main business.",
                    "foundhint-local-seo",
                  ),
                  services: __(
                    "Describe what you offer, who provides it, where, and at what price — each on its own page.",
                    "foundhint-local-seo",
                  ),
                  website: __(
                    "Tie your pages together: your website's name, each page, About and Contact, and breadcrumbs.",
                    "foundhint-local-seo",
                  ),
                }[tab]
              }
            />
          )}
        </>
      )}

      <AlertDialog
        open={Boolean(pending)}
        onOpenChange={(open) => (open ? null : setPending(null))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {__("You have unsaved changes", "foundhint-local-seo")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {__(
                "Save them before you leave this tab, discard them, or stay here.",
                "foundhint-local-seo",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <button
              type="button"
              className={dialogButton}
              onClick={() => setPending(null)}
            >
              {__("Stay", "foundhint-local-seo")}
            </button>
            <button
              type="button"
              className={dialogButton}
              onClick={() => {
                saveRef.current?.discard();
                resolvePending();
              }}
            >
              {__("Discard", "foundhint-local-seo")}
            </button>
            <button
              type="button"
              className={cn(
                dialogButton,
                "fhint:border-0 fhint:bg-[#FF6B35] fhint:text-white",
              )}
              onClick={async () => {
                await saveRef.current?.save();
                resolvePending();
              }}
            >
              {__("Save", "foundhint-local-seo")}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
