import { __ } from "@wordpress/i18n";
import { lockedBusinessState } from "../../lib/schema";
import BusinessTab from "../business/BusinessTab";
import ComingSoonTab from "./ComingSoonTab";
import LocationTab from "../locations/LocationTab";
import ServiceTab from "../services/ServiceTab";
import { TABS } from "./TabBar";
import SettingsTab from "../settings/SettingsTab";

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
 * @param {Object}   props.business      Premium's Business tab.
 * @param {Object}   props.branches      From `useLocationBranches`.
 * @param {number}   props.locationId    The location chosen in the bar.
 * @param {string}   props.branchName    Its name, when it is a branch.
 * @param {Object}   props.unsaved       From `useUnsavedGuard`.
 */
export function TabPanel({
  tab,
  plan,
  free,
  business,
  branches,
  locationId,
  branchName,
  unsaved,
}) {
  const editing = {
    live: plan.live,
    onDirtyChange: unsaved.onDirtyChange,
    saveRef: unsaved.saveRef,
  };

  if (tab === "business") {
    return (
      <BusinessTab
        state={plan.business ? business : lockedBusinessState(free)}
        locked={!plan.business}
        {...editing}
      />
    );
  }

  if (tab === "locations" && (plan.locations || !plan.business)) {
    return (
      <LocationTab
        branches={branches.branches}
        branchId={branches.branchId}
        onBranch={branches.pickBranch}
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

  if (tab === "settings") {
    return <SettingsTab ownership={free.ownership ?? {}} />;
  }

  return (
    <ComingSoonTab
      title={TABS.find(([key]) => key === tab)[1]()}
      body={COMING[tab]?.()}
    />
  );
}

export default TabPanel;
