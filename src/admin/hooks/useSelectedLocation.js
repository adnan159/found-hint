import { useLocationSelection } from "@/context/SelectedLocation";
import { useGetLocationsQuery } from "@/store/api/locationsApi";

/**
 * The location a screen is about: the one chosen in the bar at the top of
 * every page, else the main location — and the main location too when the
 * chosen one no longer exists.
 *
 * @return {Object} `locations`, `current` (the location row), `locationId`
 *                  (0 for the main location, as the API takes it), `choose`
 *                  (answers false when a screen's unsaved work stopped it),
 *                  and `ready` — whether `locationId` can be trusted yet.
 */
export function useSelectedLocation() {
  const { data, isLoading } = useGetLocationsQuery();
  const { selected, select } = useLocationSelection();
  const locations = data?.locations ?? [];

  const main =
    locations.find((location) => location.is_primary) ?? locations[0] ?? null;
  const current =
    locations.find((location) => location.id === selected) ?? main;

  const choose = (id) => {
    const location = locations.find((item) => item.id === id);

    // The main location is remembered as "none", so it stays the default.
    return select(location && !location.is_primary ? id : 0);
  };

  return {
    locations,
    current,
    locationId: current && !current.is_primary ? current.id : 0,
    choose,
    isLoading,
    ready: !isLoading,
  };
}

export default useSelectedLocation;
