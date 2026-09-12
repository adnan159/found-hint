import { useEffect, useState } from "react";
import { __ } from "@wordpress/i18n";
import { MapPinIcon } from "lucide-react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import RequestError from "@/components/RequestError";
import { fieldErrors } from "@/lib/errors";
import {
  useGetLocationsQuery,
  useUpdateLocationMutation,
} from "@/store/api/locationsApi";
import OpeningHoursEditor, {
  emptyHoursState,
  hoursToState,
  stateToPayload,
} from "@/pages/locations/components/OpeningHoursEditor";
import StepActions from "./StepActions";

/**
 * Opening hours for the location just added.
 *
 * The same editor the Locations screen uses, so the three-state model
 * (not set / closed / open) behaves identically in both places.
 */
export function HoursStep({ onDone, onBack, onSkip }) {
  const { data } = useGetLocationsQuery();
  const [updateLocation, { isLoading, error }] = useUpdateLocationMutation();

  const location = data?.locations?.[0];

  const [hours, setHours] = useState(emptyHoursState);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!location || dirty) {
      return;
    }

    setHours(hoursToState(location.opening_hours));
  }, [location, dirty]);

  // Hours belong to a location, so there is nothing to fill in until one
  // exists. Saying so beats showing an editor that cannot save.
  if (!location) {
    return (
      <div className="fhint:flex fhint:flex-col fhint:gap-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MapPinIcon />
            </EmptyMedia>
            <EmptyTitle>{__("No location yet", "found-hint")}</EmptyTitle>
            <EmptyDescription>
              {__(
                "Opening hours belong to a location. Go back a step and add your address first.",
                "found-hint",
              )}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
        <StepActions
          onBack={onBack}
          onSkip={onSkip}
          submitLabel={__("Continue", "found-hint")}
          isSaving={false}
        />
      </div>
    );
  }

  const onSubmit = async (event) => {
    event.preventDefault();

    try {
      await updateLocation({
        id: location.id,
        opening_hours: stateToPayload(hours),
      }).unwrap();
      onDone();
    } catch {
      // Shown inline and per day.
    }
  };

  return (
    <form onSubmit={onSubmit} className="fhint:flex fhint:flex-col fhint:gap-6">
      <RequestError error={error} />

      <OpeningHoursEditor
        value={hours}
        errors={fieldErrors(error)}
        onChange={(next) => {
          setDirty(true);
          setHours(next);
        }}
      />

      <StepActions isSaving={isLoading} onBack={onBack} onSkip={onSkip} />
    </form>
  );
}

export default HoursStep;
