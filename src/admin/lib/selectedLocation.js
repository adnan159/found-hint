/**
 * The location being worked on, remembered across screens.
 *
 * Choosing a location in the Business profile's switcher is choosing it for
 * the screens that are about one location — Reviews reads it too — so the
 * choice outlives the page it was made on. It is kept in this browser only:
 * a convenience, like a remembered tab, not data anyone else needs.
 *
 * Storage can be unavailable (a private window, blocked site data); then
 * nothing is remembered and every screen starts on the main location.
 */
const KEY = "fhint:selected-location";

/**
 * @return {number} The location id last chosen, or 0 for none.
 */
export function getSelectedLocation() {
  try {
    return Math.max(0, Number(window.localStorage.getItem(KEY)) || 0);
  } catch {
    return 0;
  }
}

/**
 * @param {number} id The location chosen; 0 forgets the choice.
 */
export function setSelectedLocation(id) {
  try {
    if (id) {
      window.localStorage.setItem(KEY, String(id));
    } else {
      window.localStorage.removeItem(KEY);
    }
  } catch {
    // Remembering is a convenience; without it every screen starts on the
    // main location.
  }
}
