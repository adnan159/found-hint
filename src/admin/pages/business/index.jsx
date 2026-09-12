import { useEffect, useState } from "react";
import { __ } from "@wordpress/i18n";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import PageHeader from "@/components/PageHeader";
import RequestError from "@/components/RequestError";
import SectionCard from "@/components/SectionCard";
import { businessTypes } from "@/lib/bootstrap";
import { fieldErrors } from "@/lib/errors";
import {
  useGetBusinessQuery,
  useUpdateBusinessMutation,
} from "@/store/api/businessApi";
import BusinessSkeleton from "./components/BusinessSkeleton";

const SOCIAL_NETWORKS = [
  { key: "facebook", label: "Facebook" },
  { key: "instagram", label: "Instagram" },
  { key: "x", label: "X" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "youtube", label: "YouTube" },
  { key: "tiktok", label: "TikTok" },
  { key: "pinterest", label: "Pinterest" },
  { key: "yelp", label: "Yelp" },
];

const businessTypeItems = businessTypes.map((type) => ({
  value: type,
  label: type,
}));

const EMPTY = {
  name: "",
  legal_name: "",
  business_type: "",
  primary_category: "",
  description: "",
  phone: "",
  email: "",
  website: "",
  logo_url: "",
  price_range: "",
  founding_date: "",
};

export default function BusinessPage() {
  const { data, isLoading } = useGetBusinessQuery();
  const [updateBusiness, { isLoading: isSaving, error }] =
    useUpdateBusinessMutation();

  const [form, setForm] = useState(EMPTY);
  const [social, setSocial] = useState({});
  const [dirty, setDirty] = useState(false);

  const business = data?.business;

  // Seed the form once the record arrives, and re-seed after a save so the
  // inputs show what the server actually stored (it trims and sanitises)
  // rather than what was typed. Skipped while dirty so a slow refetch can
  // never overwrite something half-typed.
  useEffect(() => {
    if (!business || dirty) {
      return;
    }

    setForm({
      name: business.name ?? "",
      legal_name: business.legal_name ?? "",
      business_type: business.business_type ?? "",
      primary_category: business.primary_category ?? "",
      description: business.description ?? "",
      phone: business.phone ?? "",
      email: business.email ?? "",
      website: business.website ?? "",
      logo_url: business.logo_url ?? "",
      price_range: business.price_range ?? "",
      founding_date: business.founding_date ?? "",
    });
    setSocial({ ...(business.social_profiles ?? {}) });
  }, [business, dirty]);

  const errors = fieldErrors(error);

  const set = (key) => (event) => {
    setDirty(true);
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  const setSocialUrl = (key) => (event) => {
    setDirty(true);
    setSocial((current) => ({ ...current, [key]: event.target.value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    try {
      await updateBusiness({ ...form, social_profiles: social }).unwrap();
      setDirty(false);
      toast.success(__("Business details saved.", "found-hint"));
    } catch {
      // The error is rendered inline by RequestError and per-field below;
      // a toast as well would say the same thing twice.
    }
  };

  if (isLoading) {
    return <BusinessSkeleton />;
  }

  return (
    <>
      <PageHeader
        title={__("Business", "found-hint")}
        description={__(
          "The details customers and search engines see. Everything else in FoundHint reads from here, so it only needs entering once.",
          "found-hint",
        )}
      />

      <form
        onSubmit={onSubmit}
        className="fhint:flex fhint:flex-col fhint:gap-5"
      >
        <RequestError error={error} />

        <SectionCard
          title={__("Business details", "found-hint")}
          description={__("How your business is identified.", "found-hint")}
        >
          <FieldGroup className="fhint:grid fhint:grid-cols-1 fhint:gap-4 fhint:md:grid-cols-2">
            <Field data-invalid={errors.name ? true : undefined}>
              <FieldLabel htmlFor="fhint-name">
                {__("Business name", "found-hint")}
              </FieldLabel>
              <Input
                id="fhint-name"
                value={form.name}
                onChange={set("name")}
                aria-invalid={errors.name ? true : undefined}
                required
              />
              {errors.name ? (
                <FieldError>{errors.name}</FieldError>
              ) : (
                <FieldDescription>
                  {__("The name customers know you by.", "found-hint")}
                </FieldDescription>
              )}
            </Field>

            <Field data-invalid={errors.legal_name ? true : undefined}>
              <FieldLabel htmlFor="fhint-legal-name">
                {__("Legal name", "found-hint")}
              </FieldLabel>
              <Input
                id="fhint-legal-name"
                value={form.legal_name}
                onChange={set("legal_name")}
                aria-invalid={errors.legal_name ? true : undefined}
              />
              {errors.legal_name ? (
                <FieldError>{errors.legal_name}</FieldError>
              ) : (
                <FieldDescription>
                  {__(
                    "Only if it differs from the trading name.",
                    "found-hint",
                  )}
                </FieldDescription>
              )}
            </Field>

            <Field data-invalid={errors.business_type ? true : undefined}>
              <FieldLabel htmlFor="fhint-business-type">
                {__("Business type", "found-hint")}
              </FieldLabel>
              <Select
                // `items` lets the trigger show the saved type's label
                // without opening the popup — the options live in a portal
                // that is not mounted until then, so without this a stored
                // value renders as the placeholder.
                items={businessTypeItems}
                // `null`, never `undefined`: an undefined value makes the
                // select uncontrolled on first render, and it then ignores
                // the real value that arrives once the profile loads — the
                // saved type would show as the placeholder forever.
                value={form.business_type || null}
                onValueChange={(value) => {
                  setDirty(true);
                  setForm((current) => ({ ...current, business_type: value }));
                }}
              >
                <SelectTrigger id="fhint-business-type">
                  <SelectValue
                    placeholder={__("Choose a type", "found-hint")}
                  />
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
                  {__("Used in your structured data.", "found-hint")}
                </FieldDescription>
              )}
            </Field>

            <Field data-invalid={errors.primary_category ? true : undefined}>
              <FieldLabel htmlFor="fhint-category">
                {__("Primary category", "found-hint")}
              </FieldLabel>
              <Input
                id="fhint-category"
                value={form.primary_category}
                onChange={set("primary_category")}
                aria-invalid={errors.primary_category ? true : undefined}
              />
              {errors.primary_category ? (
                <FieldError>{errors.primary_category}</FieldError>
              ) : (
                <FieldDescription>
                  {__("In your own words, e.g. Grocery Store.", "found-hint")}
                </FieldDescription>
              )}
            </Field>

            <Field
              className="fhint:md:col-span-2"
              data-invalid={errors.description ? true : undefined}
            >
              <FieldLabel htmlFor="fhint-description">
                {__("Description", "found-hint")}
              </FieldLabel>
              <Textarea
                id="fhint-description"
                rows={4}
                value={form.description}
                onChange={set("description")}
              />
              <FieldDescription>
                {__(
                  "A short summary of what you do and who you serve.",
                  "found-hint",
                )}
              </FieldDescription>
            </Field>
          </FieldGroup>
        </SectionCard>

        <SectionCard
          title={__("Contact", "found-hint")}
          description={__(
            "Locations can override these; leave a location's field empty to use the business value.",
            "found-hint",
          )}
        >
          <FieldGroup className="fhint:grid fhint:grid-cols-1 fhint:gap-4 fhint:md:grid-cols-3">
            <Field data-invalid={errors.phone ? true : undefined}>
              <FieldLabel htmlFor="fhint-phone">
                {__("Phone", "found-hint")}
              </FieldLabel>
              <Input
                id="fhint-phone"
                type="tel"
                value={form.phone}
                onChange={set("phone")}
                aria-invalid={errors.phone ? true : undefined}
              />
              {errors.phone ? <FieldError>{errors.phone}</FieldError> : null}
            </Field>

            <Field data-invalid={errors.email ? true : undefined}>
              <FieldLabel htmlFor="fhint-email">
                {__("Email", "found-hint")}
              </FieldLabel>
              <Input
                id="fhint-email"
                type="email"
                value={form.email}
                onChange={set("email")}
                aria-invalid={errors.email ? true : undefined}
              />
              {errors.email ? <FieldError>{errors.email}</FieldError> : null}
            </Field>

            <Field data-invalid={errors.website ? true : undefined}>
              <FieldLabel htmlFor="fhint-website">
                {__("Website", "found-hint")}
              </FieldLabel>
              <Input
                id="fhint-website"
                type="url"
                placeholder="https://"
                value={form.website}
                onChange={set("website")}
                aria-invalid={errors.website ? true : undefined}
              />
              {errors.website ? (
                <FieldError>{errors.website}</FieldError>
              ) : null}
            </Field>
          </FieldGroup>
        </SectionCard>

        <SectionCard title={__("Presentation", "found-hint")}>
          <FieldGroup className="fhint:grid fhint:grid-cols-1 fhint:gap-4 fhint:md:grid-cols-3">
            <Field data-invalid={errors.logo_url ? true : undefined}>
              <FieldLabel htmlFor="fhint-logo">
                {__("Logo URL", "found-hint")}
              </FieldLabel>
              <Input
                id="fhint-logo"
                type="url"
                placeholder="https://"
                value={form.logo_url}
                onChange={set("logo_url")}
                aria-invalid={errors.logo_url ? true : undefined}
              />
              {errors.logo_url ? (
                <FieldError>{errors.logo_url}</FieldError>
              ) : null}
            </Field>

            <Field data-invalid={errors.price_range ? true : undefined}>
              <FieldLabel htmlFor="fhint-price-range">
                {__("Price range", "found-hint")}
              </FieldLabel>
              <Input
                id="fhint-price-range"
                value={form.price_range}
                onChange={set("price_range")}
                placeholder="$$"
                aria-invalid={errors.price_range ? true : undefined}
              />
              {errors.price_range ? (
                <FieldError>{errors.price_range}</FieldError>
              ) : null}
            </Field>

            <Field data-invalid={errors.founding_date ? true : undefined}>
              <FieldLabel htmlFor="fhint-founding-date">
                {__("Founded", "found-hint")}
              </FieldLabel>
              <Input
                id="fhint-founding-date"
                type="date"
                value={form.founding_date}
                onChange={set("founding_date")}
                aria-invalid={errors.founding_date ? true : undefined}
              />
              {errors.founding_date ? (
                <FieldError>{errors.founding_date}</FieldError>
              ) : null}
            </Field>
          </FieldGroup>
        </SectionCard>

        <SectionCard
          title={__("Social profiles", "found-hint")}
          description={__(
            "Published as the profiles that belong to this business.",
            "found-hint",
          )}
        >
          <FieldGroup className="fhint:grid fhint:grid-cols-1 fhint:gap-4 fhint:md:grid-cols-2">
            {SOCIAL_NETWORKS.map(({ key, label }) => {
              const errorKey = `social_profiles.${key}`;

              return (
                <Field
                  key={key}
                  data-invalid={errors[errorKey] ? true : undefined}
                >
                  <FieldLabel htmlFor={`fhint-social-${key}`}>
                    {label}
                  </FieldLabel>
                  <Input
                    id={`fhint-social-${key}`}
                    type="url"
                    placeholder="https://"
                    value={social[key] ?? ""}
                    onChange={setSocialUrl(key)}
                    aria-invalid={errors[errorKey] ? true : undefined}
                  />
                  {errors[errorKey] ? (
                    <FieldError>{errors[errorKey]}</FieldError>
                  ) : null}
                </Field>
              );
            })}
          </FieldGroup>
        </SectionCard>

        <div className="fhint:flex fhint:items-center fhint:gap-3">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? <Spinner data-icon="inline-start" /> : null}
            {__("Save changes", "found-hint")}
          </Button>
          {dirty ? (
            <span className="fhint:text-sm fhint:text-muted-foreground">
              {__("You have unsaved changes.", "found-hint")}
            </span>
          ) : null}
        </div>
      </form>
    </>
  );
}
