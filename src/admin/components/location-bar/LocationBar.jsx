import { useState } from "react";
import { useLocation } from "react-router";
import { useLocationSelection } from "@/context/SelectedLocation";
import useSelectedLocation from "@/hooks/useSelectedLocation";
import { errorMessage } from "@/lib/errors";
import {
  useGetProfileQuery,
  useOpenGoogleListingMutation,
} from "@/store/api/profileApi";
import { useGetLocationsQuery } from "@/store/api/locationsApi";
import BusinessBar from "./BusinessBar";

/**
 * The bar at the top of every page: which business and location the admin
 * is looking at, and the switch to look at another.
 *
 * Switching here switches every screen. Choosing a Google listing that has
 * no location yet gives it one first. A screen with unsaved work may refuse
 * the switch (see `SelectedLocation`), and then nothing changes.
 *
 * Not drawn during setup, which has its own header, or before there is a
 * business to name.
 */
export function LocationBar() {
  const { pathname } = useLocation();
  const { locationId, choose, ready } = useSelectedLocation();
  const { select } = useLocationSelection();
  const { refetch: refetchLocations } = useGetLocationsQuery();
  const { currentData: profile } = useGetProfileQuery(locationId, {
    skip: !ready,
  });
  const [openListing, { isLoading: opening }] = useOpenGoogleListingMutation();
  const [switchError, setSwitchError] = useState("");

  // Nothing to name and nothing to switch between while no Google account
  // is linked: the server sends the details empty, and so the bar goes too.
  if (
    pathname.startsWith("/setup") ||
    !profile?.meta?.exists ||
    profile?.meta?.google?.linked === false
  ) {
    return null;
  }

  const onSwitch = async (entry) => {
    if (!entry) {
      return;
    }

    setSwitchError("");

    if (entry.locationId) {
      choose(entry.locationId);
      return;
    }

    try {
      const opened = await openListing({
        locationName: entry.locationName,
      }).unwrap();

      // Chosen by id straight away; the list of locations catches up.
      select(opened.location_id);
      refetchLocations();
    } catch (failure) {
      setSwitchError(errorMessage(failure));
    }
  };

  return (
    <BusinessBar
      info={profile.sections?.info}
      meta={profile.meta}
      logo={profile.sections?.media?.logo}
      onSwitch={onSwitch}
      switching={opening}
      switchError={switchError}
    />
  );
}

export default LocationBar;
