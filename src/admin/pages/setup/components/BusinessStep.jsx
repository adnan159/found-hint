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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import RequestError from "@/components/RequestError";
import { businessTypes } from "@/lib/bootstrap";
import { fieldErrors } from "@/lib/errors";
import {
  useGetBusinessQuery,
  useUpdateBusinessMutation,
} from "@/store/api/businessApi";
import StepActions from "./StepActions";

const typeItems = businessTypes.map((type) => ({ value: type, label: type }));

/**
 * Business details.
 *
 * Saves through PUT /business — the same endpoint the Business screen
 * uses — so there is one set of rules and re-running setup cannot produce
 * a different result from editing the screen directly.
 */
export function BusinessStep({ onDone, onBack, onSkip }) {
  const { data } = useGetBusinessQuery();
  const [updateBusiness, { isLoading, error }] = useUpdateBusinessMutation();

  const [form, setForm] = useState({
    name: "",
    business_type: "",
    phone: "",
    email: "",
    website: "",
  });
  const [dirty, setDirty] = useState(false);

  const business = data?.business;

  useEffect(() => {
    if (!business || dirty) {
      return;
    }

    setForm({
      name: business.name ?? "",
      business_type: business.business_type ?? "",
      phone: business.phone ?? "",
      email: business.email ?? "",
      website: business.website ?? "",
    });
  }, [business, dirty]);

  const errors = fieldErrors(error);
  const set = (key) => (event) => {
    setDirty(true);
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    try {
      await updateBusiness(form).unwrap();
      onDone();
    } catch {
      // Shown inline; staying on the step is what lets it be corrected.
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
          <FieldLabel htmlFor="setup-name">
            {__("Business name", "found-hint")}
          </FieldLabel>
          <Input
            id="setup-name"
            value={form.name}
            onChange={set("name")}
            aria-invalid={errors.name ? true : undefined}
            required
          />
          {errors.name ? (
            <FieldError>{errors.name}</FieldError>
          ) : (
            <FieldDescription>
              {__("Exactly as customers know you.", "found-hint")}
            </FieldDescription>
          )}
        </Field>

        <Field data-invalid={errors.business_type ? true : undefined}>
          <FieldLabel htmlFor="setup-type">
            {__("Business type", "found-hint")}
          </FieldLabel>
          <Select
            items={typeItems}
            value={form.business_type || null}
            onValueChange={(value) => {
              setDirty(true);
              setForm((current) => ({ ...current, business_type: value }));
            }}
          >
            <SelectTrigger id="setup-type" className="fhint:w-full">
              <SelectValue placeholder={__("Choose a type", "found-hint")} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {businessTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {errors.business_type ? (
            <FieldError>{errors.business_type}</FieldError>
          ) : (
            <FieldDescription>
              {__("What kind of business this is.", "found-hint")}
            </FieldDescription>
          )}
        </Field>

        <Field data-invalid={errors.phone ? true : undefined}>
          <FieldLabel htmlFor="setup-phone">
            {__("Phone", "found-hint")}
          </FieldLabel>
          <Input
            id="setup-phone"
            type="tel"
            value={form.phone}
            onChange={set("phone")}
            aria-invalid={errors.phone ? true : undefined}
          />
          {errors.phone ? <FieldError>{errors.phone}</FieldError> : null}
        </Field>

        <Field data-invalid={errors.email ? true : undefined}>
          <FieldLabel htmlFor="setup-email">
            {__("Email", "found-hint")}
          </FieldLabel>
          <Input
            id="setup-email"
            type="email"
            value={form.email}
            onChange={set("email")}
            aria-invalid={errors.email ? true : undefined}
          />
          {errors.email ? <FieldError>{errors.email}</FieldError> : null}
        </Field>

        <Field data-invalid={errors.website ? true : undefined}>
          <FieldLabel htmlFor="setup-website">
            {__("Website", "found-hint")}
          </FieldLabel>
          <Input
            id="setup-website"
            type="url"
            placeholder="https://"
            value={form.website}
            onChange={set("website")}
            aria-invalid={errors.website ? true : undefined}
          />
          {errors.website ? <FieldError>{errors.website}</FieldError> : null}
        </Field>
      </FieldGroup>

      <StepActions isSaving={isLoading} onBack={onBack} onSkip={onSkip} />
    </form>
  );
}

export default BusinessStep;
