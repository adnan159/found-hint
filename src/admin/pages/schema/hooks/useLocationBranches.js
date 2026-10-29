import { useGetLocationsQuery } from "@/store/api/locationsApi";
import { useGetSchemaQuery } from "@/store/api/schemaApi";
import {
  useGetLocationSchemaQuery,
  useGetLocationSchemasQuery,
} from "@/store/api/schemaManagerApi";
import { lockedLocationState } from "../lib/schema";

/**
 * The Location tab's branches, the one on screen and its schema.
 *
 * With Pro serving `schema.locations` the list and the schema are
 * Premium's; without it, every location but the main one, shown locked with
 * the markup the free plugin prints. Nothing is fetched while the tab is
 * closed.
 *
 * The branch on screen is the one chosen in the location bar, when it is a
 * branch; picking another switches the bar.
 *
 * @param {Object}   options
 * @param {boolean}  options.pro        Pro serves `schema.locations`.
 * @param {boolean}  options.open       The Location tab is open.
 * @param {number}   options.locationId The location chosen in the bar.
 * @param {Function} options.choose     Switch the location bar.
 */
export default function useLocationBranches({ pro, open, locationId, choose }) {
  const { data: premiumBranches } = useGetLocationSchemasQuery(undefined, {
    skip: !pro || !open,
  });
  const { data: freeLocations } = useGetLocationsQuery(undefined, {
    skip: pro || !open,
  });

  const branches = pro
    ? (premiumBranches ?? [])
    : (freeLocations?.locations ?? [])
        .filter((location) => !location.is_primary)
        .map((location) => ({
          id: location.id,
          name: location.business_name || location.name,
          status:
            location.status === "permanently_closed" ? "inactive" : "active",
          pages: null,
        }));

  const branchId = branches.some((branch) => branch.id === locationId)
    ? locationId
    : 0;

  const { data: branchState } = useGetLocationSchemaQuery(branchId, {
    skip: !pro || !branchId || !open,
  });
  const { data: freeBranch } = useGetSchemaQuery(branchId, {
    skip: pro || !branchId || !open,
  });

  // A pill switches the bar; the unsaved-changes guard prompts first.
  const pickBranch = (id) => {
    if (id !== branchId) {
      choose(id);
    }
  };

  return {
    branches,
    branchId,
    state: pro
      ? branchState
      : freeBranch
        ? lockedLocationState(freeBranch)
        : null,
    pickBranch,
  };
}
