import { useEffect, useState } from "react";
import { __ } from "@wordpress/i18n";
import { ArrowLeftIcon, Trash2Icon } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Switch } from "@/components/ui/switch";
import PageHeader from "@/components/PageHeader";
import RequestError from "@/components/RequestError";
import SectionCard from "@/components/SectionCard";
import { locationStatuses, timezones } from "@/lib/bootstrap";
import { fieldErrors } from "@/lib/errors";
import {
  useCreateLocationMutation,
  useDeleteLocationMutation,
  useGetLocationQuery,
  useUpdateLocationMutation,
} from "@/store/api/locationsApi";
import OpeningHoursEditor, {
  emptyHoursState,
  hoursToState,
  stateToPayload,
} from "./components/OpeningHoursEditor";

const STATUS_LABELS = {
  active: () => __("Active", "found-hint"),
  inactive: () => __("Inactive", "found-hint"),
  temporarily_closed: () => __("Temporarily closed", "found-hint"),
  permanently_closed: () => __("Permanently closed", "found-hint"),
};

// Base UI resolves the trigger label from `items`; without it a stored
// value shows as the placeholder, because the options are portalled and
// unmounted until the popup opens.
const statusItems = locationStatuses.map((status) => ({
  value: status,
  label: STATUS_LABELS[status] ? STATUS_LABELS[status]() : status,
}));

const EMPTY = {
  name: "",
  address_line_1: "",
  address_line_2: "",
  city: "",
  region: "",
  postal_code: "",
  country: "",
  latitude: "",
  longitude: "",
  phone: "",
  email: "",
  website: "",
  timezone: "",
  status: "active",
  is_primary: false,
};

export default function LocationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === "new";

  const { data: location, isLoading } = useGetLocationQuery(id, {
    skip: isNew,
  });

  const [createLocation, createState] = useCreateLocationMutation();
  const [updateLocation, updateState] = useUpdateLocationMutation();
  const [deleteLocation] = useDeleteLocationMutation();

  const { isLoading: isSaving, error } = isNew ? createState : updateState;

  const [form, setForm] = useState(EMPTY);
  const [hours, setHours] = useState(emptyHoursState);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!location || dirty) {
      return;
    }

    setForm({
      name: location.name ?? "",
      address_line_1: location.address_line_1 ?? "",
      address_line_2: location.address_line_2 ?? "",
      city: location.city ?? "",
      region: location.region ?? "",
      postal_code: location.postal_code ?? "",
      country: location.country ?? "",
      // null means "no coordinate"; 0 is a real one and must survive.
      latitude: location.latitude === null ? "" : String(location.latitude),
      longitude: location.longitude === null ? "" : String(location.longitude),
      phone: location.phone ?? "",
      email: location.email ?? "",
      website: location.website ?? "",
      timezone: location.timezone ?? "",
      status: location.status ?? "active",
      is_primary: Boolean(location.is_primary),
    });
    setHours(hoursToState(location.opening_hours));
  }, [location, dirty]);

  const errors = fieldErrors(error);

  const set = (key) => (event) => {
    setDirty(true);
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    const payload = { ...form, opening_hours: stateToPayload(hours) };

    try {
      if (isNew) {
        const created = await createLocation(payload).unwrap();
        toast.success(__("Location added.", "found-hint"));
        setDirty(false);
        navigate(`/locations/${created.id}`);
        return;
      }

      await updateLocation({ id, ...payload }).unwrap();
      setDirty(false);
      toast.success(__("Location saved.", "found-hint"));
    } catch {
      // Shown inline by RequestError and per field.
    }
  };

  const onDelete = async () => {
    try {
      await deleteLocation(id).unwrap();
      toast.success(__("Location deleted.", "found-hint"));
      navigate("/locations");
    } catch {
      toast.error(__("Could not delete the location.", "found-hint"));
    } finally {
      setConfirmingDelete(false);
    }
  };

  if (!isNew && isLoading) {
    return <PageHeader title={__("Loading location…", "found-hint")} />;
  }

  return (
    <>
      <PageHeader
        title={
          isNew
            ? __("Add location", "found-hint")
            : form.name || __("Location", "found-hint")
        }
        actions={
          <Button variant="outline" render={<Link to="/locations" />}>
            <ArrowLeftIcon data-icon="inline-start" />
            {__("All locations", "found-hint")}
          </Button>
        }
      />

      <form
        onSubmit={onSubmit}
        className="fhint:flex fhint:flex-col fhint:gap-5"
      >
        <RequestError error={error} />

        <SectionCard title={__("Address", "found-hint")}>
          <FieldGroup className="fhint:grid fhint:grid-cols-1 fhint:gap-4 fhint:md:grid-cols-2">
            <Field
              className="fhint:md:col-span-2"
              data-invalid={errors.name ? true : undefined}
            >
              <FieldLabel htmlFor="fhint-loc-name">
                {__("Location name", "found-hint")}
              </FieldLabel>
              <Input
                id="fhint-loc-name"
                value={form.name}
                onChange={set("name")}
                aria-invalid={errors.name ? true : undefined}
                required
              />
              {errors.name ? (
                <FieldError>{errors.name}</FieldError>
              ) : (
                <FieldDescription>
                  {__("For example Downtown, or Main Office.", "found-hint")}
                </FieldDescription>
              )}
            </Field>

            <Field data-invalid={errors.address_line_1 ? true : undefined}>
              <FieldLabel htmlFor="fhint-loc-address1">
                {__("Street address", "found-hint")}
              </FieldLabel>
              <Input
                id="fhint-loc-address1"
                value={form.address_line_1}
                onChange={set("address_line_1")}
                aria-invalid={errors.address_line_1 ? true : undefined}
              />
              {errors.address_line_1 ? (
                <FieldError>{errors.address_line_1}</FieldError>
              ) : null}
            </Field>

            <Field>
              <FieldLabel htmlFor="fhint-loc-address2">
                {__("Suite, unit or floor", "found-hint")}
              </FieldLabel>
              <Input
                id="fhint-loc-address2"
                value={form.address_line_2}
                onChange={set("address_line_2")}
              />
            </Field>

            <Field data-invalid={errors.city ? true : undefined}>
              <FieldLabel htmlFor="fhint-loc-city">
                {__("City", "found-hint")}
              </FieldLabel>
              <Input
                id="fhint-loc-city"
                value={form.city}
                onChange={set("city")}
                aria-invalid={errors.city ? true : undefined}
              />
              {errors.city ? <FieldError>{errors.city}</FieldError> : null}
            </Field>

            <Field data-invalid={errors.region ? true : undefined}>
              <FieldLabel htmlFor="fhint-loc-region">
                {__("State or region", "found-hint")}
              </FieldLabel>
              <Input
                id="fhint-loc-region"
                value={form.region}
                onChange={set("region")}
                aria-invalid={errors.region ? true : undefined}
              />
              {errors.region ? <FieldError>{errors.region}</FieldError> : null}
            </Field>

            <Field data-invalid={errors.postal_code ? true : undefined}>
              <FieldLabel htmlFor="fhint-loc-postal">
                {__("Postal code", "found-hint")}
              </FieldLabel>
              <Input
                id="fhint-loc-postal"
                value={form.postal_code}
                onChange={set("postal_code")}
              />
            </Field>

            <Field data-invalid={errors.country ? true : undefined}>
              <FieldLabel htmlFor="fhint-loc-country">
                {__("Country", "found-hint")}
              </FieldLabel>
              <Input
                id="fhint-loc-country"
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

            <Field data-invalid={errors.latitude ? true : undefined}>
              <FieldLabel htmlFor="fhint-loc-lat">
                {__("Latitude", "found-hint")}
              </FieldLabel>
              <Input
                id="fhint-loc-lat"
                inputMode="decimal"
                value={form.latitude}
                onChange={set("latitude")}
                aria-invalid={errors.latitude ? true : undefined}
              />
              {errors.latitude ? (
                <FieldError>{errors.latitude}</FieldError>
              ) : (
                <FieldDescription>
                  {__("Leave empty if you don't know it.", "found-hint")}
                </FieldDescription>
              )}
            </Field>

            <Field data-invalid={errors.longitude ? true : undefined}>
              <FieldLabel htmlFor="fhint-loc-lng">
                {__("Longitude", "found-hint")}
              </FieldLabel>
              <Input
                id="fhint-loc-lng"
                inputMode="decimal"
                value={form.longitude}
                onChange={set("longitude")}
                aria-invalid={errors.longitude ? true : undefined}
              />
              {errors.longitude ? (
                <FieldError>{errors.longitude}</FieldError>
              ) : null}
            </Field>
          </FieldGroup>
        </SectionCard>

        <SectionCard
          title={__("Contact", "found-hint")}
          description={__(
            "Leave a field empty to use the business value.",
            "found-hint",
          )}
        >
          <FieldGroup className="fhint:grid fhint:grid-cols-1 fhint:gap-4 fhint:md:grid-cols-3">
            <Field data-invalid={errors.phone ? true : undefined}>
              <FieldLabel htmlFor="fhint-loc-phone">
                {__("Phone", "found-hint")}
              </FieldLabel>
              <Input
                id="fhint-loc-phone"
                type="tel"
                value={form.phone}
                onChange={set("phone")}
                aria-invalid={errors.phone ? true : undefined}
              />
              {errors.phone ? <FieldError>{errors.phone}</FieldError> : null}
            </Field>

            <Field data-invalid={errors.email ? true : undefined}>
              <FieldLabel htmlFor="fhint-loc-email">
                {__("Email", "found-hint")}
              </FieldLabel>
              <Input
                id="fhint-loc-email"
                type="email"
                value={form.email}
                onChange={set("email")}
                aria-invalid={errors.email ? true : undefined}
              />
              {errors.email ? <FieldError>{errors.email}</FieldError> : null}
            </Field>

            <Field data-invalid={errors.website ? true : undefined}>
              <FieldLabel htmlFor="fhint-loc-website">
                {__("Website", "found-hint")}
              </FieldLabel>
              <Input
                id="fhint-loc-website"
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

        <SectionCard
          title={__("Opening hours", "found-hint")}
          description={__(
            "A day left as Not set publishes nothing — which is different from being closed.",
            "found-hint",
          )}
        >
          <OpeningHoursEditor
            value={hours}
            errors={errors}
            onChange={(next) => {
              setDirty(true);
              setHours(next);
            }}
          />
        </SectionCard>

        <SectionCard title={__("Status", "found-hint")}>
          <FieldGroup className="fhint:grid fhint:grid-cols-1 fhint:gap-4 fhint:md:grid-cols-2">
            <Field data-invalid={errors.status ? true : undefined}>
              <FieldLabel htmlFor="fhint-loc-status">
                {__("Status", "found-hint")}
              </FieldLabel>
              <Select
                items={statusItems}
                value={form.status}
                onValueChange={(value) => {
                  setDirty(true);
                  setForm((current) => ({ ...current, status: value }));
                }}
              >
                <SelectTrigger id="fhint-loc-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {locationStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {STATUS_LABELS[status]
                          ? STATUS_LABELS[status]()
                          : status}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {errors.status ? <FieldError>{errors.status}</FieldError> : null}
            </Field>

            <Field data-invalid={errors.timezone ? true : undefined}>
              <FieldLabel htmlFor="fhint-loc-timezone">
                {__("Time zone", "found-hint")}
              </FieldLabel>
              <Input
                id="fhint-loc-timezone"
                list="fhint-timezones"
                value={form.timezone}
                onChange={set("timezone")}
                placeholder="America/New_York"
                aria-invalid={errors.timezone ? true : undefined}
              />
              <datalist id="fhint-timezones">
                {timezones.map((zone) => (
                  <option key={zone} value={zone} />
                ))}
              </datalist>
              {errors.timezone ? (
                <FieldError>{errors.timezone}</FieldError>
              ) : null}
            </Field>

            <Field orientation="horizontal" className="fhint:md:col-span-2">
              <Switch
                id="fhint-loc-primary"
                checked={form.is_primary}
                onCheckedChange={(checked) => {
                  setDirty(true);
                  setForm((current) => ({ ...current, is_primary: checked }));
                }}
              />
              <FieldContentWrapper>
                <FieldLabel htmlFor="fhint-loc-primary">
                  {__("Primary location", "found-hint")}
                </FieldLabel>
                <FieldDescription>
                  {__(
                    "Used wherever a single place is needed. Only one location can be primary.",
                    "found-hint",
                  )}
                </FieldDescription>
              </FieldContentWrapper>
            </Field>
          </FieldGroup>
        </SectionCard>

        <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? <Spinner data-icon="inline-start" /> : null}
            {isNew
              ? __("Add location", "found-hint")
              : __("Save changes", "found-hint")}
          </Button>

          {dirty ? (
            <span className="fhint:text-sm fhint:text-muted-foreground">
              {__("You have unsaved changes.", "found-hint")}
            </span>
          ) : null}

          {!isNew ? (
            <Button
              type="button"
              variant="ghost"
              className="fhint:ml-auto"
              onClick={() => setConfirmingDelete(true)}
            >
              <Trash2Icon data-icon="inline-start" />
              {__("Delete location", "found-hint")}
            </Button>
          ) : null}
        </div>
      </form>

      <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {__("Delete this location?", "found-hint")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {__(
                "Its opening hours go with it. This cannot be undone.",
                "found-hint",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{__("Keep it", "found-hint")}</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>
              {__("Delete location", "found-hint")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * Wrapper so a switch row reads as label + description beside the control.
 */
function FieldContentWrapper({ children }) {
  return (
    <div className="fhint:flex fhint:flex-col fhint:gap-1">{children}</div>
  );
}
