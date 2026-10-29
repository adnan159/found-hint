import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import { TABS } from "../components/page/TabBar";

/**
 * The open tab, kept in the URL (`#/schema?tab=locations`), and the way to
 * open another.
 *
 * A branch chosen in the location bar opens the Location tab; the main
 * location opens the Business tab. The other tabs are site-wide and stay
 * where they are.
 *
 * @param {number} locationId The location chosen in the bar; 0 is the main.
 * @return {{tab: string, go: Function}} The open tab, and `go(key)`.
 */
export default function useSchemaTab(locationId) {
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab");
  const tab = TABS.some(([key]) => key === requested) ? requested : "business";

  const go = (key) => {
    setParams(key === "business" ? {} : { tab: key }, { replace: true });
  };

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

  return { tab, go };
}
