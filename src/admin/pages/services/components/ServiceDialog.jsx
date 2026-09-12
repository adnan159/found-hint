import { useEffect, useState } from "react";
import { __ } from "@wordpress/i18n";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import RequestError from "@/components/RequestError";
import { defaultCurrency, serviceStatuses } from "@/lib/bootstrap";
import { fieldErrors } from "@/lib/errors";
import {
  useCreateServiceMutation,
  useUpdateServiceMutation,
} from "@/store/api/servicesApi";

const STATUS_LABELS = {
  active: () => __("Active", "found-hint"),
  inactive: () => __("Inactive", "found-hint"),
};

const statusItems = serviceStatuses.map((status) => ({
  value: status,
  label: STATUS_LABELS[status] ? STATUS_LABELS[status]() : status,
}));

const blank = () => ({
  name: "",
  slug: "",
  description: "",
  price: "",
  currency: defaultCurrency,
  url: "",
  status: "active",
});

/**
 * Add or edit one service.
 *
 * The same dialog does both: the fields and rules are identical, and two
 * near-copies would drift apart the first time one of them changed.
 */
export function ServiceDialog({ open, onOpenChange, service }) {
  const isEdit = Boolean(service?.id);

  const [createService, createState] = useCreateServiceMutation();
  const [updateService, updateState] = useUpdateServiceMutation();

  const { isLoading: isSaving, error } = isEdit ? updateState : createState;
  const [form, setForm] = useState(blank);

  // Reset whenever the dialog opens so a previous edit — or a previous
  // failed attempt — never leaks into the next one.
  useEffect(() => {
    if (!open) {
      return;
    }

    setForm(
      service
        ? {
            name: service.name ?? "",
            slug: service.slug ?? "",
            description: service.description ?? "",
            price: service.price === null ? "" : String(service.price),
            currency: service.currency ?? defaultCurrency,
            url: service.url ?? "",
            status: service.status ?? "active",
          }
        : blank(),
    );
  }, [open, service]);

  const errors = fieldErrors(error);

  const set = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const onSubmit = async (event) => {
    event.preventDefault();

    // Send the slug only when it was actually typed. On create the server
    // derives it from the name; on edit, omitting it keeps the existing one,
    // which may already be in a published URL.
    const payload = { ...form };

    if (!isEdit && !payload.slug) {
      delete payload.slug;
    }

    try {
      if (isEdit) {
        await updateService({ id: service.id, ...payload }).unwrap();
        toast.success(__("Service updated.", "found-hint"));
      } else {
        await createService(payload).unwrap();
        toast.success(__("Service added.", "found-hint"));
      }

      onOpenChange(false);
    } catch {
      // Rendered inline in the dialog; closing it would hide the reason.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fhint:sm:max-w-xl">
        <form
          onSubmit={onSubmit}
          className="fhint:flex fhint:flex-col fhint:gap-4"
        >
          <DialogHeader>
            <DialogTitle>
              {isEdit
                ? __("Edit service", "found-hint")
                : __("Add service", "found-hint")}
            </DialogTitle>
            <DialogDescription>
              {__(
                "Services appear in your structured data and on your location pages.",
                "found-hint",
              )}
            </DialogDescription>
          </DialogHeader>

          <RequestError error={error} />

          <FieldGroup className="fhint:grid fhint:grid-cols-1 fhint:gap-4 fhint:sm:grid-cols-2">
            <Field
              className="fhint:sm:col-span-2"
              data-invalid={errors.name ? true : undefined}
            >
              <FieldLabel htmlFor="fhint-service-name">
                {__("Name", "found-hint")}
              </FieldLabel>
              <Input
                id="fhint-service-name"
                value={form.name}
                onChange={set("name")}
                aria-invalid={errors.name ? true : undefined}
                required
              />
              {errors.name ? <FieldError>{errors.name}</FieldError> : null}
            </Field>

            <Field
              className="fhint:sm:col-span-2"
              data-invalid={errors.description ? true : undefined}
            >
              <FieldLabel htmlFor="fhint-service-description">
                {__("Description", "found-hint")}
              </FieldLabel>
              <Textarea
                id="fhint-service-description"
                rows={3}
                value={form.description}
                onChange={set("description")}
              />
            </Field>

            <Field data-invalid={errors.price ? true : undefined}>
              <FieldLabel htmlFor="fhint-service-price">
                {__("Price", "found-hint")}
              </FieldLabel>
              <Input
                id="fhint-service-price"
                inputMode="decimal"
                value={form.price}
                onChange={set("price")}
                aria-invalid={errors.price ? true : undefined}
              />
              {errors.price ? (
                <FieldError>{errors.price}</FieldError>
              ) : (
                <FieldDescription>
                  {__("Leave empty to publish no price.", "found-hint")}
                </FieldDescription>
              )}
            </Field>

            <Field data-invalid={errors.currency ? true : undefined}>
              <FieldLabel htmlFor="fhint-service-currency">
                {__("Currency", "found-hint")}
              </FieldLabel>
              <Input
                id="fhint-service-currency"
                value={form.currency}
                onChange={set("currency")}
                placeholder="USD"
                maxLength={3}
                aria-invalid={errors.currency ? true : undefined}
              />
              {errors.currency ? (
                <FieldError>{errors.currency}</FieldError>
              ) : (
                <FieldDescription>
                  {__("Required when a price is set.", "found-hint")}
                </FieldDescription>
              )}
            </Field>

            <Field data-invalid={errors.url ? true : undefined}>
              <FieldLabel htmlFor="fhint-service-url">
                {__("Link", "found-hint")}
              </FieldLabel>
              <Input
                id="fhint-service-url"
                type="url"
                placeholder="https://"
                value={form.url}
                onChange={set("url")}
                aria-invalid={errors.url ? true : undefined}
              />
              {errors.url ? <FieldError>{errors.url}</FieldError> : null}
            </Field>

            <Field data-invalid={errors.status ? true : undefined}>
              <FieldLabel htmlFor="fhint-service-status">
                {__("Status", "found-hint")}
              </FieldLabel>
              <Select
                items={statusItems}
                value={form.status}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, status: value }))
                }
              >
                <SelectTrigger id="fhint-service-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {serviceStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {STATUS_LABELS[status]
                          ? STATUS_LABELS[status]()
                          : status}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            {isEdit ? (
              <Field
                className="fhint:sm:col-span-2"
                data-invalid={errors.slug ? true : undefined}
              >
                <FieldLabel htmlFor="fhint-service-slug">
                  {__("URL slug", "found-hint")}
                </FieldLabel>
                <Input
                  id="fhint-service-slug"
                  value={form.slug}
                  onChange={set("slug")}
                  aria-invalid={errors.slug ? true : undefined}
                />
                {errors.slug ? (
                  <FieldError>{errors.slug}</FieldError>
                ) : (
                  <FieldDescription>
                    {__(
                      "Renaming the service does not change this, because it may already be in a published link.",
                      "found-hint",
                    )}
                  </FieldDescription>
                )}
              </Field>
            ) : null}
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {__("Cancel", "found-hint")}
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Spinner data-icon="inline-start" /> : null}
              {isEdit
                ? __("Save service", "found-hint")
                : __("Add service", "found-hint")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ServiceDialog;
