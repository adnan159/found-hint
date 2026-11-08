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
  return window.FHINT?.upgrade_url || "https://foundhint.com/pricing/";
}

/**
 * Premium is installed but its licence isn't active (Freemius): every
 * Premium feature is locked until it is. Different from "no Premium", so
 * the screen asks to activate rather than to buy.
 */
export function licenseInactive() {
  return Boolean(pro?.license && !pro.license.active);
}

/** Where the licence is activated (the Plugins screen, by Freemius). */
export function activateUrl() {
  return pro?.license?.activate_url || "";
}

/** The add-on's REST base (`…/fhint-premium/v1`), or "" without Pro. */
export function proRestUrl() {
  return pro?.rest_url ?? "";
}

/**
 * A Premium route's full address, with query parameters. On a site with
 * plain permalinks the base is `…/index.php?rest_route=/fhint-premium/v1`,
 * which already has a `?` — a second one breaks the route ("No route was
 * found"), so the separator is chosen from the base.
 *
 * @param {string} path   Path under the namespace, e.g. "/reviews/templates".
 * @param {Object} params Query parameters.
 * @return {string}
 */
export function proUrl(path, params) {
  const base = `${proRestUrl()}${path}`;
  const query = new URLSearchParams(params ?? {}).toString();

  if (!query) {
    return base;
  }

  return `${base}${base.includes("?") ? "&" : "?"}${query}`;
}
