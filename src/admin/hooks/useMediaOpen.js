import { useSyncExternalStore } from "react";
import { isMediaOpen } from "@/lib/media";

const subscribe = (change) => {
  window.addEventListener("fhint:media", change);

  return () => window.removeEventListener("fhint:media", change);
};

/**
 * Whether a Media Library window is open above this screen. A dialog uses
 * it to stay open, and to stop trapping focus, while the library is in use.
 *
 * @return {boolean}
 */
export function useMediaOpen() {
  return useSyncExternalStore(subscribe, isMediaOpen, () => false);
}

export default useMediaOpen;
