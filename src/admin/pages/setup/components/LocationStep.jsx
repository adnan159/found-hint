import { useEffect, useState } from "react";
import { __ } from "@wordpress/i18n";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import RequestError from "@/components/RequestError";
import { fieldErrors } from "@/lib/errors";
import {
  useCreateLocationMutation,
  useGetLocationsQuery,
  useUpdateLocationMutation,
} from "@/store/api/locationsApi";
import StepActions from "./StepActions";

/**
 * The address customers visit.
 *
 * Creates the location on first save and updates it afterwards, so
 * stepping back and forth through setup cannot leave duplicates behind.
 */
export function LocationStep({ onDone, onBack, onSkip }) {
  const { data } = useGetLocationsQuery();
  const [createLocation, createState] = useCreateLocationMutation();
  const [updateLocation, updateState] = useUpdateLocationMutation();

  const existing = data?.locations?.[0];
  const { isLoading, error } = existing ? updateState : createState;

  const [form, setForm] = useState({
    name: "",
    address_line_1: "",
    city: "",
    region: "",
    postal_code: "",
    country: "",
  });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!existing || dirty) {
      return;
    }

    setForm({
      name: existing.name ?? "",
      address_line_1: existing.address_line_1 ?? "",
      city: existing.city ?? "",
      region: existing.region ?? "",
      postal_code: existing.postal_code ?? "",
      country: existing.country ?? "",
    });
  }, [existing, dirty]);

  const errors = fieldErrors(error);
  const set = (key) => (event) => {
    setDirty(true);
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    try {
      if (existing) {
        await updateLocation({ id: existing.id, ...form }).unwrap();
      } else {
        await createLocation(form).unwrap();
      }

      onDone();
    } catch {
      // Shown inline.
    }
  };

  return (
    <form onSubmit={onSubmit} className="fhint:flex fhint:flex-col fhint:gap-6">
      <RequestError error={error} />

      <FieldGroup className="fhint:grid fhint:grid-cols-1 fhint:gap-4 fhint:md:grid-cols-2">
        <Field
          className="fhint:md:col-span-2"
          data-invalid={errors.name ? true : undefined}
        >
          <FieldLabel htmlFor="setup-loc-name">
            {__("Location name", "found-hint")}
          </FieldLabel>
          <Input
            id="setup-loc-name"
            value={form.name}
            onChange={set("name")}
            aria-invalid={errors.name ? true : undefined}
            required
          />
          {errors.name ? (
            <FieldError>{errors.name}</FieldError>
          ) : (
            <FieldDescription>
              {__(
                "Something you would recognise, like Downtown or Main Office.",
                "found-hint",
              )}
            </FieldDescription>
          )}
        </Field>

        <Field
          className="fhint:md:col-span-2"
          data-invalid={errors.address_line_1 ? true : undefined}
        >
          <FieldLabel htmlFor="setup-loc-address">
            {__("Street address", "found-hint")}
          </FieldLabel>
          <Input
            id="setup-loc-address"
            value={form.address_line_1}
            onChange={set("address_line_1")}
            aria-invalid={errors.address_line_1 ? true : undefined}
          />
          {errors.address_line_1 ? (
            <FieldError>{errors.address_line_1}</FieldError>
          ) : null}
        </Field>

        <Field data-invalid={errors.city ? true : undefined}>
          <FieldLabel htmlFor="setup-loc-city">
            {__("City", "found-hint")}
          </FieldLabel>
          <Input
            id="setup-loc-city"
            value={form.city}
            onChange={set("city")}
            aria-invalid={errors.city ? true : undefined}
          />
          {errors.city ? <FieldError>{errors.city}</FieldError> : null}
        </Field>

        <Field data-invalid={errors.region ? true : undefined}>
          <FieldLabel htmlFor="setup-loc-region">
            {__("State or region", "found-hint")}
          </FieldLabel>
          <Input
            id="setup-loc-region"
            value={form.region}
            onChange={set("region")}
            aria-invalid={errors.region ? true : undefined}
          />
          {errors.region ? <FieldError>{errors.region}</FieldError> : null}
        </Field>

        <Field data-invalid={errors.postal_code ? true : undefined}>
          <FieldLabel htmlFor="setup-loc-postal">
            {__("Postal code", "found-hint")}
          </FieldLabel>
          <Input
            id="setup-loc-postal"
            value={form.postal_code}
            onChange={set("postal_code")}
          />
        </Field>

        <Field data-invalid={errors.country ? true : undefined}>
          <FieldLabel htmlFor="setup-loc-country">
            {__("Country", "found-hint")}
          </FieldLabel>
          <Input
            id="setup-loc-country"
            value={form.country}
            onChange={set("country")}
            placeholder="US"
            maxLength={2}
            aria-invalid={errors.country ? true : undefined}
          />
          {errors.country ? (
            <FieldError>{errors.country}</FieldError>
          ) : (
            <FieldDescription>
              {__("Two-letter country code.", "found-hint")}
            </FieldDescription>
          )}
        </Field>
      </FieldGroup>

      <StepActions isSaving={isLoading} onBack={onBack} onSkip={onSkip} />
    </form>
  );
}

export default LocationStep;
