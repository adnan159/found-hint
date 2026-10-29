import { __, _n, sprintf } from "@wordpress/i18n";
import { placementLabel } from "./schema";

/**
 * The one-line summary under each tab's name in the tab bar.
 *
 * "…" while the numbers load; "Pro" for a tab the plan does not include;
 * "Coming in a later update" for one Pro has not shipped yet.
 *
 * @param {Object}  data
 * @param {Object}  data.plan     `{ business, locations, services }`: what
 *                                Pro serves.
 * @param {Object}  data.free     The free plugin's schema (`GET schema`).
 * @param {Object}  data.state    Premium's Schema Manager state.
 * @param {Object}  data.business Premium's Business tab.
 * @return {Object} Summary text by tab key.
 */
export function tabSummaries({ plan, free, state, business }) {
  const pro = __("Pro", "foundhint-local-seo");
  const soon = __("Coming in a later update", "foundhint-local-seo");
  const notYet = plan.business ? soon : pro;

  return {
    business: plan.business
      ? business
        ? `${business.schema_kind === "organization" ? "Organization" : business.type} · ${placementLabel(business.placement)}`
        : "…"
      : free?.graph?.["@graph"]?.[0]?.["@type"]
        ? `${free.graph["@graph"][0]["@type"]} · ${placementLabel("every_page")}`
        : pro,
    locations: plan.locations ? locationsSummary(state) : notYet,
    services: plan.services ? servicesSummary(state) : notYet,
    website: notYet,
    settings: __("Who publishes it", "foundhint-local-seo"),
  };
}

function locationsSummary(state) {
  const tab = state?.tabs?.locations;

  if (!tab) {
    return "…";
  }

  return `${sprintf(
    /* translators: %d: branches switched on. */
    _n("%d branch", "%d branches", tab.branches, "foundhint-local-seo"),
    tab.branches,
  )} · ${sprintf(
    /* translators: %d: pages the branches print on. */
    _n("%d page", "%d pages", tab.pages, "foundhint-local-seo"),
    tab.pages,
  )}`;
}

function servicesSummary(state) {
  const tab = state?.tabs?.services;

  if (!tab?.ready) {
    return "…";
  }

  return tab.check
    ? sprintf(
        /* translators: 1: active services, 2: services with something to check. */
        __("%1$d active · %2$d to check", "foundhint-local-seo"),
        tab.active,
        tab.check,
      )
    : sprintf(
        /* translators: %d: active services. */
        __("%d active", "foundhint-local-seo"),
        tab.active,
      );
}
