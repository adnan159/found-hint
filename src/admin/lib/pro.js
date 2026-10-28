/**
 * Whether FoundHint Pro is active, and with which features.
 *
 * All of FoundHint's screens, Pro ones included, live in this app. The Pro
 * add-on is server-side only: when active it adds `pro` to the page's
 * bootstrap data (`fhint_admin_bootstrap_data`) with the features it
 * serves. A Pro screen shows its working version only when its feature is
 * listed; otherwise the upsell. The real check is on the server — every
 * Pro route lives in the add-on and does not exist without it.
 */
const pro = window.FHINT?.pro ?? null;

/** Pro's bootstrap data, or null when Pro is not active. */
export function proInfo() {
  return pro;
}

/** Is this Pro feature served by the active add-on? */
export function hasPro(feature) {
  return Boolean(
    pro && Array.isArray(pro.features) && pro.features.includes(feature),
  );
}

/**
 * Where "Upgrade to Pro" goes. From the bootstrap data (`upgrade_url`), so
 * it can change without a release of the app.
 */
export function upgradeUrl() {
  return window.FHINT?.upgrade_url || "https://foundhint.com/";
}

/** The add-on's REST base (`…/fhint-pro/v1`), or "" without Pro. */
export function proRestUrl() {
  return pro?.rest_url ?? "";
}
