import { __, sprintf } from "@wordpress/i18n";
import { LinkIcon, UnlinkIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import RequestError from "@/components/RequestError";
import SectionCard from "@/components/SectionCard";
import {
  useMapGoogleLocationMutation,
  useUnmapGoogleLocationMutation,
} from "@/store/api/googleApi";

/**
 * Which Google profile is which of our locations.
 *
 * **Nothing maps itself.** Two branches on the same street can have nearly
 * identical names and addresses, and a wrong mapping would later push one
 * branch's details onto another. Close matches are offered as suggestions,
 * with what matched shown, and the operator chooses.
 */
function MappingRow({ location, googleLocations, onMap, onUnmap, isBusy }) {
  const [choice, setChoice] = useState("");

  const available = googleLocations.filter(
    (candidate) =>
      candidate.fhint_location_id === 0 ||
      candidate.fhint_location_id === location.id,
  );

  const suggestionNames = new Set(
    (location.suggestions ?? []).map((item) => item.location_name),
  );

  if (location.mapped_to) {
    return (
      <div className="fhint:flex fhint:flex-wrap fhint:items-start fhint:gap-4 fhint:border fhint:border-border fhint:px-4 fhint:py-3.5">
        <div className="fhint:min-w-0 fhint:flex-1">
          <div className="fhint:text-[13px] fhint:font-bold">
            {location.name || __("Untitled location", "foundhint-local-seo")}
          </div>
          <div className="fhint:text-[12.5px] fhint:text-muted-strong">
            {location.address}
          </div>
        </div>
        <div className="fhint:min-w-0 fhint:flex-1">
          <div className="fhint:flex fhint:items-center fhint:gap-1.5 fhint:text-[13px] fhint:font-bold">
            <LinkIcon aria-hidden="true" className="fhint:size-3.5" />
            {location.mapped_title || location.mapped_to}
          </div>
          <div className="fhint:text-[12.5px] fhint:text-muted-strong">
            {location.mapped_address}
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={isBusy}
          onClick={() => onUnmap(location.mapped_to)}
        >
          <UnlinkIcon data-icon="inline-start" />
          {__("Unlink", "foundhint-local-seo")}
        </Button>
      </div>
    );
  }

  return (
    <div className="fhint:flex fhint:flex-wrap fhint:items-start fhint:gap-4 fhint:border fhint:border-border fhint:px-4 fhint:py-3.5">
      <div className="fhint:min-w-0 fhint:flex-1">
        <div className="fhint:text-[13px] fhint:font-bold">
          {location.name || __("Untitled location", "foundhint-local-seo")}
        </div>
        <div className="fhint:text-[12.5px] fhint:text-muted-strong">
          {location.address}
        </div>
      </div>

      <div className="fhint:flex fhint:min-w-[280px] fhint:flex-1 fhint:flex-col fhint:gap-2">
        <Select value={choice || null} onValueChange={setChoice}>
          <SelectTrigger
            id={`fhint-map-${location.id}`}
            aria-label={sprintf(
              /* translators: %s: name of one of this site's locations. */
              __("Google profile for %s", "foundhint-local-seo"),
              location.name,
            )}
          >
            <SelectValue
              placeholder={__("Choose a Google profile", "foundhint-local-seo")}
            />
          </SelectTrigger>
          <SelectContent>
            {available.map((candidate) => (
              <SelectItem
                key={candidate.location_name}
                value={candidate.location_name}
              >
                {candidate.title || candidate.location_name}
                {suggestionNames.has(candidate.location_name)
                  ? ` — ${__("looks like a match", "foundhint-local-seo")}`
                  : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {location.suggestions?.length ? (
          <p className="fhint:text-[12.5px] fhint:text-muted-strong">
            {sprintf(
              /* translators: %s: name of the closest matching Google profile. */
              __("Closest match: %s", "foundhint-local-seo"),
              location.suggestions[0].title ||
                location.suggestions[0].location_name,
            )}
          </p>
        ) : null}
      </div>

      <Button
        type="button"
        disabled={!choice || isBusy}
        onClick={() => onMap(choice, location.id)}
      >
        <LinkIcon data-icon="inline-start" />
        {__("Link", "foundhint-local-seo")}
      </Button>
    </div>
  );
}

export function LocationMapping({ overview, isConnected }) {
  const [map, { isLoading: isMapping, error: mapError }] =
    useMapGoogleLocationMutation();
  const [unmap, { isLoading: isUnmapping, error: unmapError }] =
    useUnmapGoogleLocationMutation();

  const locations = overview?.locations ?? [];
  const googleLocations = overview?.google_locations ?? [];
  const isBusy = isMapping || isUnmapping;

  const onMap = async (locationName, fhintLocationId) => {
    try {
      await map({
        location_name: locationName,
        fhint_location_id: fhintLocationId,
      }).unwrap();
      toast.success(__("Linked.", "foundhint-local-seo"));
    } catch {
      // Shown inline.
    }
  };

  const onUnmap = async (locationName) => {
    try {
      await unmap({ location_name: locationName }).unwrap();
      toast.success(__("Unlinked.", "foundhint-local-seo"));
    } catch {
      // Shown inline.
    }
  };

  return (
    <SectionCard
      id="google-mapping"
      title={__("Location mapping", "foundhint-local-seo")}
      description={__(
        "Say which Google profile is which of your locations. Nothing is linked for you.",
        "foundhint-local-seo",
      )}
    >
      <RequestError error={mapError ?? unmapError} />

      {locations.length === 0 ? (
        <Empty>
          <EmptyTitle>
            {__("No locations yet", "foundhint-local-seo")}
          </EmptyTitle>
          <EmptyDescription>
            {__(
              "Add a location first, then come back to link it to its Google profile.",
              "foundhint-local-seo",
            )}
          </EmptyDescription>
        </Empty>
      ) : googleLocations.length === 0 ? (
        <Empty>
          <EmptyTitle>
            {__("No Google profiles read yet", "foundhint-local-seo")}
          </EmptyTitle>
          <EmptyDescription>
            {isConnected
              ? __(
                  "Read from Google above, then link each location to its profile.",
                  "foundhint-local-seo",
                )
              : __("Connect a Google account first.", "foundhint-local-seo")}
          </EmptyDescription>
        </Empty>
      ) : (
        <div className="fhint:flex fhint:flex-col fhint:gap-2.5">
          {locations.map((location) => (
            <MappingRow
              key={location.id}
              location={location}
              googleLocations={googleLocations}
              onMap={onMap}
              onUnmap={onUnmap}
              isBusy={isBusy}
            />
          ))}
        </div>
      )}
    </SectionCard>
  );
}

export default LocationMapping;
