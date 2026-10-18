import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import {
  getSelectedLocation,
  setSelectedLocation,
} from "@/lib/selectedLocation";

/**
 * The location the whole admin is looking at.
 *
 * One choice for every screen: the bar at the top of each page switches it,
 * and the Business profile, Reviews, the audit, the schema preview and the
 * dashboard all show that location. Remembered in this browser between
 * visits. `0` means the main location.
 *
 * A screen with unsaved work can stand in the way of a switch: it registers
 * a guard, and a guard that answers `false` keeps the current location.
 */
const SelectedLocationContext = createContext(null);

export function SelectedLocationProvider({ children }) {
  const [selected, setSelected] = useState(getSelectedLocation);
  const guards = useRef(new Set());

  const select = useCallback((id) => {
    for (const guard of guards.current) {
      if (guard(id) === false) {
        return false;
      }
    }

    setSelectedLocation(id);
    setSelected(id);

    return true;
  }, []);

  const registerGuard = useCallback((guard) => {
    guards.current.add(guard);

    return () => guards.current.delete(guard);
  }, []);

  return (
    <SelectedLocationContext.Provider
      value={{ selected, select, registerGuard }}
    >
      {children}
    </SelectedLocationContext.Provider>
  );
}

// Outside the provider (a test render, a screen mounted on its own) the
// choice still works, it just is not shared.
const standalone = {
  selected: 0,
  select: () => true,
  registerGuard: () => () => {},
};

export function useLocationSelection() {
  return useContext(SelectedLocationContext) ?? standalone;
}
