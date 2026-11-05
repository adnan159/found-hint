import { __ } from "@wordpress/i18n";
import { Skeleton } from "@/components/ui/skeleton";
import { lockedBusinessState } from "../../lib/schema";
import BusinessTab from "../business/BusinessTab";
import MainBusinessPicker from "../business/MainBusinessPicker";
import ComingSoonTab from "./ComingSoonTab";
import PremiumTab from "./PremiumTab";
import OffPanel from "./OffPanel";
import LocationTab from "../locations/LocationTab";
import ServiceTab from "../services/ServiceTab";
import { TABS } from "./TabBar";
import OutputSettings from "../settings/OutputSettings";
import SettingsTab from "../settings/SettingsTab";
import WebsiteTab from "../website/WebsiteTab";

// What a tab will do, for one Pro has not shipped yet.
const COMING = {
  locations: () =>
    __(
      "Describe each branch: its own address, phone, hours and page, linked to your main business.",
      "foundhint-local-seo",
    ),
  services: () =>
    __(
      "Describe what you offer, who provides it, where, and at what price — each on its own page.",
      "foundhint-local-seo",
    ),
  website: () =>
    __(
      "Tie your pages together: your website's name, each page, About and Contact, and breadcrumbs.",
      "foundhint-local-seo",
    ),
};

/**
 * The open tab's content.
 *
 * Each tab is live when Pro serves it, locked (showing the markup the free
 * plugin prints) without Pro at all, and "coming" when Pro is there but has
 * not shipped that tab yet.
 *
 * @param {Object}   props
 * @param {string}   props.tab           The open tab.
 * @param {Object}   props.plan          `{ business, locations, services,
 *                                       live }`: what Pro serves.
 * @param {Object}   props.free          The free plugin's schema.
 * @param {Object}   props.business      Premium's LocalBusiness tab.
 * @param {Object}   props.organization  Premium's Organization tab.
 * @param {Object}   props.enabled       Each tab's switch.
 * @param {boolean}  props.switching     A switch is being saved.
 * @param {Function} props.onToggle      `(key, on)`: switch a tab.
 * @param {Object}   props.branches      From `useLocationBranches`.
 * @param {number}   props.locationId    The location chosen in the bar.
 * @param {string}   props.branchName    Its name, when it is a branch.
 * @param {Object}   props.unsaved       From `useUnsavedGuard`.
 */
/**
 * The open tab: its form, or — switched off — only the off panel, with the
 * button that turns it back on. Its saved details are kept either way.
 */
export function TabPanel(props) {
  if (props.enabled?.[props.tab] === false) {
    return (
      <OffPanel
        tab={props.tab}
        locked={!props.plan.business}
        busy={props.switching}
        onTurnOn={() => props.onToggle?.(props.tab, true)}
        headOffice={props.business?.main?.visit === "no"}
        onOpenTab={props.onOpenTab}
      />
    );
  }

  return <TabContent {...props} />;
}

function TabContent({
  tab,
  plan,
  free,
  business,
  organization,
  branches,
  onAllLocations,
  onOpenMain,
  syncedAt,
  locationId,
  branchName,
  unsaved,
}) {
  const editing = {
    live: plan.live,
    onDirtyChange: unsaved.onDirtyChange,
    saveRef: unsaved.saveRef,
  };

  if (tab === "organization" || tab === "localbusiness") {
    const state = plan.business
      ? tab === "organization"
        ? organization
        : business
      : lockedBusinessState(free);

    // With several Google profiles, the main business is chosen first.
    if (tab === "localbusiness" && plan.business && state?.main?.ask) {
      return <MainBusinessPicker main={state.main} locked={false} />;
    }

    return state ? (
      <BusinessTab
        key={tab}
        kind={tab}
        state={state}
        locked={!plan.business}
        {...editing}
      />
    ) : (
      <Skeleton className="fhint:h-[60vh] fhint:w-full" />
    );
  }

  if (tab === "locations" && (plan.locations || !plan.business)) {
    return (
      <LocationTab
        branches={branches.branches}
        branchId={branches.branchId}
        onBranch={branches.pickBranch}
        onAllLocations={onAllLocations}
        onOpenMain={onOpenMain}
        syncedAt={syncedAt}
        state={branches.state}
        locked={!plan.locations}
        {...editing}
      />
    );
  }

  if (tab === "services" && (plan.services || !plan.business)) {
    return (
      <ServiceTab
        list={locationId}
        branchName={branchName}
        free={free}
        locked={!plan.services}
        guard={unsaved.guard}
        {...editing}
      />
    );
  }

  if (tab === "website" && plan.website) {
    return <WebsiteTab {...editing} />;
  }

  if (tab === "settings") {
    return (
      <div className="fhint:grid fhint:min-w-0 fhint:grid-cols-[minmax(0,1fr)] fhint:gap-4">
        {plan.settings ? <OutputSettings /> : null}
        <SettingsTab ownership={free.ownership ?? {}} />
      </div>
    );
  }

  // Without Premium (or its licence): the tab's Premium panel. With it, a
  // tab whose step has not shipped yet says so.
  return !plan.business ? (
    <PremiumTab
      title={TABS.find(([key]) => key === tab)[1]()}
      body={COMING[tab]?.()}
    />
  ) : (
    <ComingSoonTab
      title={TABS.find(([key]) => key === tab)[1]()}
      body={COMING[tab]?.()}
    />
  );
}

export default TabPanel;
