import { errorMessage } from "@/lib/errors";
import { useRefreshFromGoogleMutation } from "@/store/api/profileApi";
import { __ } from "@wordpress/i18n";
import { useEffect, useRef, useState } from "react";

/**
 * Reading the listing from Google, asked for or not.
 *
 * Google is read without being asked in two cases: the first time a mapped
 * listing is opened, and every time the location is switched — so the
 * location just chosen shows what its own listing holds now, not what was
 * read the last time somebody looked. Once each per arrival: `autoReadLocations`
 * remembers which location the read was for, and is cleared by a switch.
 *
 * @param {Object}  options
 * @param {number}  options.locationId The location on screen.
 * @param {Object}  options.google     `meta.google` for that location.
 * @param {boolean} options.ready      Whether a read may start by itself: the
 *                                     profile has loaded and nothing on it is
 *                                     unsaved.
 */
export function useGoogleRead({ locationId, google, ready }) {
  const [requestRefresh, { isLoading: isRefreshing }] =
    useRefreshFromGoogleMutation();
  // What the last read came to, said beside the button that asked for it.
  const [refreshNotice, setRefreshNotice] = useState(null);
  const noticeTimer = useRef(null);
  const autoReadLocations = useRef(new Set());
  const switchedToLocation = useRef(null);

  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  const refreshFromGoogle = async () => {
    setRefreshNotice(null);

    try {
      const { meta: answered } = await requestRefresh({
        locationId,
      }).unwrap();
      const failed = answered?.refresh?.failed ?? [];

      clearTimeout(noticeTimer.current);
      setRefreshNotice(
        failed.length
          ? {
              tone: "bad",
              text: __(
                "Google answered for only part of your listing. Try again in a moment.",
                "foundhint-local-seo",
              ),
            }
          : {
              tone: "ok",
              text: __("Up to date with Google.", "foundhint-local-seo"),
            },
      );

      if (!failed.length) {
        noticeTimer.current = setTimeout(() => setRefreshNotice(null), 4000);
      }
    } catch (failure) {
      setRefreshNotice({ tone: "bad", text: errorMessage(failure) });
    }
  };

  const shouldAutoRead =
    ready &&
    Boolean(google.mapped) &&
    (google.refreshed_at === null || switchedToLocation.current === locationId);

  useEffect(() => {
    if (!shouldAutoRead || autoReadLocations.current.has(locationId)) {
      return;
    }

    autoReadLocations.current.add(locationId);
    switchedToLocation.current = null;
    refreshFromGoogle();
    // `refreshFromGoogle` is recreated every render and is left out of the list on
    // purpose; the guard above is what makes this run once.
  }, [shouldAutoRead, locationId]);

  // Mark an arrival at another location, so its listing is read once it has
  // loaded. The last read's verdict was about the location being left.
  const markLocationSwitch = (id) => {
    setRefreshNotice(null);
    autoReadLocations.current.delete(id);
    switchedToLocation.current = id;
  };

  return {
    refreshFromGoogle,
    isRefreshing,
    refreshNotice,
    markLocationSwitch,
  };
}

export default useGoogleRead;
