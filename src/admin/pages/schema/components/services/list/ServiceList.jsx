import { useState } from "react";
import { __, sprintf } from "@wordpress/i18n";
import { toast } from "sonner";
import { cn } from "cn";
import { errorMessage } from "@/lib/errors";
import {
  useReorderServiceSchemasMutation,
  useSetServiceStatusMutation,
} from "@/store/api/schemaManagerApi";
import { movedIds } from "../../../lib/service";
import ListHeader, { LIST_TITLE_ID } from "./ListHeader";
import EmptyList from "./EmptyList";
import ListSummary from "./ListSummary";
import ServiceRow from "./ServiceRow";
import { panel } from "../../styles";

/**
 * 03 Service schema — the list (doc §7.1): one row per service, with its
 * checks, a switch that saves at once, and an order that drives the output.
 *
 * The parts live in `components/services/` (header, summary, row); the rules in
 * `lib/service`.
 */
export function ServiceList({
  list,
  services,
  limits,
  selected,
  locked,
  branchName = "",
  onPick,
  onAdd,
}) {
  // The row whose checks are open, and the row being dragged (by index).
  const [open, setOpen] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [setStatus] = useSetServiceStatusMutation();
  const [reorder] = useReorderServiceSchemasMutation();
  const active = services.filter(
    (service) => service.status !== "inactive",
  ).length;

  const move = async (from, to) => {
    const ids = movedIds(services, from, to);

    if (!ids) {
      return;
    }

    try {
      await reorder({ list, ids }).unwrap();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const toggle = async (service, on) => {
    try {
      await setStatus({
        id: service.id,
        status: on ? "active" : "inactive",
      }).unwrap();
      toast.success(
        sprintf(
          on
            ? /* translators: %s: service name. */
              __("%s is published.", "foundhint-local-seo")
            : /* translators: %s: service name. */
              __("%s is off your site.", "foundhint-local-seo"),
          service.name,
        ),
      );
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  // Drop on a row: the dragged one takes its place.
  const dragHandlers = (index) => ({
    onDragStart: (event) => {
      setDragging(index);
      event.dataTransfer.effectAllowed = "move";
    },
    onDragOver: (event) => {
      if (dragging !== null) {
        event.preventDefault();
      }
    },
    onDrop: (event) => {
      event.preventDefault();
      move(dragging, index);
      setDragging(null);
    },
    onDragEnd: () => setDragging(null),
  });

  return (
    <section
      aria-labelledby={LIST_TITLE_ID}
      className={cn(panel, "fhint:min-w-0")}
    >
      <ListHeader
        locked={locked}
        canAdd={!locked && (limits?.can_add ?? true)}
        limits={limits}
        onAdd={onAdd}
      />

      <ListSummary
        branchName={list ? branchName : ""}
        active={active}
        inactive={services.length - active}
      />

      {!services.length ? (
        <EmptyList locked={locked} list={list} branchName={branchName} />
      ) : (
        <ul
          className="fhint:m-0 fhint:list-none fhint:p-0"
          aria-label={__("Services", "foundhint-local-seo")}
        >
          {services.map((service, index) => (
            <ServiceRow
              key={service.id}
              service={service}
              first={index === 0}
              last={index === services.length - 1}
              current={service.id === selected}
              expanded={open === service.id}
              dragged={dragging === index}
              locked={locked}
              drag={dragHandlers(index)}
              onMove={(step) => move(index, index + step)}
              onPick={() => onPick(service.id)}
              onExpand={() => setOpen(open === service.id ? null : service.id)}
              onToggle={(on) => toggle(service, on)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

export default ServiceList;
