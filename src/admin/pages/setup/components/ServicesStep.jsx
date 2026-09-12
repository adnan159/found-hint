import { useState } from "react";
import { __, sprintf } from "@wordpress/i18n";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import RequestError from "@/components/RequestError";
import {
  useCreateServiceMutation,
  useDeleteServiceMutation,
  useGetServicesQuery,
} from "@/store/api/servicesApi";
import StepActions from "./StepActions";

/**
 * A quick way to list what the business offers.
 *
 * Deliberately just names: setup is trying to get a useful list on the
 * board, and prices, links and descriptions are all editable later on the
 * Services screen. Each name is saved immediately through POST /services,
 * so nothing is lost if setup is abandoned midway.
 */
export function ServicesStep({ onDone, onBack, onSkip }) {
  const { data } = useGetServicesQuery();
  const [createService, { isLoading, error }] = useCreateServiceMutation();
  const [deleteService] = useDeleteServiceMutation();

  const [name, setName] = useState("");

  const services = data?.services ?? [];
  const limits = data?.limits;
  const canAdd = limits ? limits.can_add : true;

  const add = async (event) => {
    event.preventDefault();

    if (!name.trim()) {
      return;
    }

    try {
      await createService({ name: name.trim(), status: "active" }).unwrap();
      setName("");
    } catch {
      // Shown inline.
    }
  };

  return (
    <div className="fhint:flex fhint:flex-col fhint:gap-6">
      <RequestError error={error} />

      <form
        onSubmit={add}
        className="fhint:flex fhint:flex-wrap fhint:items-end fhint:gap-2.5"
      >
        <Field className="fhint:min-w-[260px] fhint:flex-1">
          <FieldLabel htmlFor="setup-service">
            {__("Service name", "found-hint")}
          </FieldLabel>
          <Input
            id="setup-service"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={__("Routine check-up", "found-hint")}
            disabled={!canAdd}
          />
        </Field>
        <Button type="submit" disabled={isLoading || !canAdd || !name.trim()}>
          <PlusIcon data-icon="inline-start" />
          {__("Add", "found-hint")}
        </Button>
      </form>

      {services.length > 0 ? (
        <ul className="fhint:flex fhint:flex-col fhint:border fhint:border-border">
          {services.map((service) => (
            <li
              key={service.id}
              className="fhint:flex fhint:items-center fhint:gap-3 fhint:border-b fhint:border-b-border fhint:px-4 fhint:py-2.5 fhint:last:border-b-0"
            >
              <span className="fhint:text-[13px] fhint:font-bold">
                {service.name}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="fhint:ml-auto"
                aria-label={sprintf(
                  /* translators: %s: service name. */
                  __("Remove %s", "found-hint"),
                  service.name,
                )}
                onClick={() => deleteService(service.id)}
              >
                <Trash2Icon />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="fhint:text-[13px] fhint:text-muted-strong">
          {__(
            "Nothing listed yet. Add the things people actually come to you for.",
            "found-hint",
          )}
        </p>
      )}

      {!canAdd && limits ? (
        <p className="fhint:text-[13px] fhint:text-muted-strong">
          {sprintf(
            /* translators: %d: number of services included in the plan. */
            __("That is all %d services your plan includes.", "found-hint"),
            limits.limit,
          )}
        </p>
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          onDone();
        }}
      >
        <StepActions
          isSaving={false}
          onBack={onBack}
          onSkip={onSkip}
          submitLabel={__("Continue", "found-hint")}
        />
      </form>
    </div>
  );
}

export default ServicesStep;
