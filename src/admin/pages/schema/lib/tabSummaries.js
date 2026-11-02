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
 * @param {Object}  data.state    Premium's Schema Manager state.
 * @param {Object}  data.business Premium's LocalBusiness tab.
 * @return {Object} Summary text by tab key.
 */
export function tabSummaries({ plan, state, business }) {
  const pro = __("Premium", "foundhint-local-seo");
  const soon = __("Coming in a later update", "foundhint-local-seo");
  const notYet = plan.business ? soon : pro;

  const summaries = {
    organization: plan.business
      ? state?.tabs?.organization
        ? `Organization · ${placementLabel(state.tabs.organization.placement)}`
        : "…"
      : pro,
    localbusiness: plan.business
      ? business
        ? `${business.type} · ${placementLabel(business.placement)}`
        : "…"
      : pro,
    locations: plan.locations ? locationsSummary(state) : notYet,
    services: plan.services ? servicesSummary(state) : notYet,
    website: plan.website
      ? state?.tabs?.website?.ready
        ? sprintf(
            /* translators: 1: rows on, 2: all rows. */
            __("%1$d of %2$d added", "foundhint-local-seo"),
            state.tabs.website.on,
            state.tabs.website.total,
          )
        : "…"
      : notYet,
    // What a switched-off tab says instead of "Off · not printed": 02 under
    // a head office customers don't visit (location setup).
    offText:
      plan.business && business?.main?.visit === "no"
        ? {
            localbusiness: __(
              "Head office · described in 01",
              "foundhint-local-seo",
            ),
          }
        : {},
    settings: plan.settings
      ? state?.tabs?.settings?.ready
        ? state.tabs.settings.enabled
          ? __("Added to site header", "foundhint-local-seo")
          : __("Header output off", "foundhint-local-seo")
        : "…"
      : __("Who publishes it", "foundhint-local-seo"),
  };

  // Tabs that only say "Premium": the tab bar shows them as a badge.
  summaries.premium = Object.fromEntries(
    Object.entries(summaries)
      .filter(([, text]) => text === pro)
      .map(([key]) => [key, true]),
  );

  return summaries;
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
