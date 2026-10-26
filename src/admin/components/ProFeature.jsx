import { hasPro } from "@/lib/pro";

/**
 * Show `children` — a Pro feature's working screen — when FoundHint Pro is
 * active and serves `feature`, and `fallback` (the upsell) otherwise.
 *
 * @param {Object} props
 * @param {string} props.feature  Feature key, as Pro lists it, e.g. "reviews.templates".
 * @param {*}      props.fallback What shows without Pro.
 */
export function ProFeature({ feature, fallback = null, children }) {
  return hasPro(feature) ? children : fallback;
}

export default ProFeature;
