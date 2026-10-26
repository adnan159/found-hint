import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { __ } from "@wordpress/i18n";
import { ArrowLeftRightIcon } from "lucide-react";
import { pillButton } from "./styles";

/**
 * Everything the switcher can open: the locations here, and the listings on
 * the Google account that have no location here yet.
 *
 * A listing that already has a location is that location, so it is listed
 * once. A location with no listing — one typed in by hand — is listed too.
 *
 * @param {Object[]} locations `meta.locations`.
 * @param {Object[]} listings  `meta.listings`.
 * @return {Object[]} Each `{ key, locationId, locationName, name, address, isPrimary }`.
 */
export function switcherEntries(locations = [], listings = []) {
  const entries = locations.map((item) => ({
    key: `location:${item.id}`,
    locationId: item.id,
    locationName: "",
    name: item.name,
    address: item.address,
    isPrimary: Boolean(item.is_primary),
  }));

  for (const listing of listings) {
    if (listing.location_id) {
      continue;
    }

    entries.push({
      key: `listing:${listing.location_name}`,
      locationId: 0,
      locationName: listing.location_name,
      name: listing.title,
      address: listing.address,
      isPrimary: false,
    });
  }

  return entries;
}

/**
 * The menu that changes which location's profile is on screen.
 *
 * @param {Object}   props
 * @param {Object[]} props.entries  From `switcherEntries()`.
 * @param {?Object}  props.location The location on screen.
 * @param {Function} props.onSwitch Called with the entry chosen.
 * @param {boolean}  props.busy     A listing is being opened.
 */
export function LocationSwitcher({ entries, location, onSwitch, busy }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={pillButton} disabled={busy}>
        {busy ? (
          <Spinner className="fhint:size-3.5" />
        ) : (
          <ArrowLeftRightIcon aria-hidden="true" className="fhint:size-3.5" />
        )}
        {busy
          ? __("Opening…", "foundhint-local-seo")
          : __("Switch location", "foundhint-local-seo")}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="fhint:w-[320px] fhint:rounded-none"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            {__("Show the profile of", "foundhint-local-seo")}
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={location ? `location:${location.id}` : ""}
            onValueChange={(value) =>
              onSwitch(entries.find((entry) => entry.key === value))
            }
          >
            {entries.map((entry) => (
              <DropdownMenuRadioItem
                key={entry.key}
                value={entry.key}
                className="fhint:cursor-pointer fhint:items-start fhint:rounded-none"
              >
                <span className="fhint:grid fhint:min-w-0 fhint:gap-0.5">
                  <span className="fhint:font-bold">
                    {entry.name}
                    {entry.isPrimary ? (
                      <span className="fhint:ml-2 fhint:text-[10px] fhint:font-extrabold fhint:tracking-[0.07em] fhint:text-muted-strong fhint:uppercase">
                        {__("Main", "foundhint-local-seo")}
                      </span>
                    ) : null}
                  </span>
                  {entry.address ? (
                    <span className="fhint:text-[12.5px] fhint:text-muted-strong">
                      {entry.address}
                    </span>
                  ) : null}
                  {entry.locationId ? null : (
                    <span className="fhint:text-[12px] fhint:text-notice-foreground">
                      {__(
                        "On Google, not set up here yet. Opening it brings its details across.",
                        "foundhint-local-seo",
                      )}
                    </span>
                  )}
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default LocationSwitcher;
