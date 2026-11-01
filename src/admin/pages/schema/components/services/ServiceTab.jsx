import { useEffect, useState } from "react";
import { cn } from "cn";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetBlankServiceSchemaQuery,
  useGetServiceSchemaQuery,
  useGetServiceSchemasQuery,
} from "@/store/api/schemaManagerApi";
import { lockedServices } from "../../lib/schema";
import ServiceEditor from "./editor/ServiceEditor";
import ServiceList from "./list/ServiceList";

/**
 * A free row as the editor reads it: the values the free markup prints.
 */
function lockedState(row) {
  const node = row.node ?? {};

  return {
    id: row.id,
    from_google: false,
    values: {
      name: node.name ?? "",
      description: node.description ?? "",
      service_type: "",
      status: "active",
      image: { mode: node.image ? "url" : "none", url: node.image ?? "" },
      provider: { mode: "business", branch_ids: [] },
      person: { name: "", type: "Person" },
      areas: [],
      page: { mode: "url", post_id: 0, url: node.url ?? "" },
      pricing: {
        model: node.offers ? "fixed" : "none",
        price: node.offers?.price ?? "",
        max: "",
        currency: node.offers?.priceCurrency ?? "USD",
      },
      placement: "own_page",
      post_ids: [],
    },
    page: { url: node.url ?? "", title: node.url ?? "" },
    warnings: [],
    options: { business: row.meta?.provider ?? "", branches: [] },
    node,
  };
}

/**
 * 03 Service schema (doc §7): the list, and the editor for the service
 * picked in it. The list is the one the top bar's location keeps — the
 * business's own for the main location, a branch's own for a branch.
 *
 * `guard(run)` runs `run` now, or once unsaved changes are saved or
 * discarded.
 */
export function ServiceTab({
  list,
  branchName,
  free,
  locked,
  live,
  guard,
  onDirtyChange,
  saveRef,
}) {
  const [selected, setSelected] = useState(null);
  // Set when the user opens a service from the list, so the editor comes
  // into view; a first load leaves the page where it is.
  const [reveal, setReveal] = useState(false);
  // A service just added is shown before the refreshed list includes it.
  const [added, setAdded] = useState(null);
  const open = (id) => {
    setSelected(id);
    setReveal(true);
  };
  const { data: index, isLoading } = useGetServiceSchemasQuery(list, {
    skip: locked,
  });
  const services = locked ? lockedServices(free) : (index?.services ?? []);
  const current =
    selected === "new"
      ? "new"
      : (added !== null && selected === added) ||
          services.some((service) => service.id === selected)
        ? selected
        : (services[0]?.id ?? null);

  // Another list starts from its first service.
  useEffect(() => {
    setSelected(null);
    setReveal(false);
  }, [list]);

  const { data: state } = useGetServiceSchemaQuery(current, {
    skip: locked || !current || current === "new",
  });
  const { data: blank } = useGetBlankServiceSchemaQuery(list, {
    skip: locked || current !== "new",
  });

  const editorState = locked
    ? services.find((service) => service.id === current)
      ? lockedState(services.find((service) => service.id === current))
      : null
    : current === "new"
      ? blank
      : state?.id === current
        ? state
        : null;

  if (!locked && isLoading) {
    return <Skeleton className="fhint:h-[50vh] fhint:w-full" />;
  }

  const listPanel = (
    <ServiceList
      list={list}
      services={services}
      limits={index?.limits}
      branchName={branchName}
      selected={current}
      locked={locked}
      onPick={(id) => id !== current && guard(() => open(id))}
      onAdd={() => guard(() => open("new"))}
    />
  );

  // Design: with a service open, the list sits above its form and the
  // preview runs beside both; on a narrow screen everything stacks.
  return (
    <div className="fhint:@container fhint:min-w-0">
      <div
        className={cn(
          "fhint:grid fhint:min-w-0 fhint:grid-cols-[minmax(0,1fr)] fhint:items-start fhint:gap-4",
          // With a service open, the list and its form are one card (no
          // gap between them); the preview keeps its distance.
          current &&
            "fhint:gap-y-0 fhint:@4xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]",
        )}
      >
        <div className="fhint:min-w-0 fhint:@4xl:col-start-1">{listPanel}</div>

        {editorState ? (
          <ServiceEditor
            key={`${list}-${current}`}
            list={list}
            state={editorState}
            isNew={current === "new"}
            locked={locked}
            live={live}
            onDirtyChange={onDirtyChange}
            saveRef={saveRef}
            onSaved={(id) => {
              if (id && id !== current) {
                setAdded(id);
                setSelected(id);
              }
            }}
            onRemoved={() => setSelected(null)}
            reveal={reveal}
          />
        ) : current ? (
          <Skeleton className="fhint:h-[40vh] fhint:w-full fhint:@4xl:col-start-1" />
        ) : null}
      </div>
    </div>
  );
}

export default ServiceTab;
