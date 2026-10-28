import { useState } from "react";
import { __, _n, sprintf } from "@wordpress/i18n";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  GripVerticalIcon,
  PlusIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import Hint from "@/components/Hint";
import { Switch } from "@/components/ui/switch";
import { errorMessage } from "@/lib/errors";
import { focus } from "@/pages/profile/styles";
import {
  useReorderServiceSchemasMutation,
  useSetServiceStatusMutation,
} from "@/store/api/schemaManagerApi";
import { BADGES, muted, panel, pill, primary } from "./styles";

/**
 * A check, in words (doc §7.2, page warnings).
 *
 * @param {Object} warning `{ code, …params }` from the server.
 * @return {string} The sentence.
 */
export function warningText(warning) {
  switch (warning.code) {
    case "no_page":
      return __(
        "No service page yet. Choose the page about this service, or nothing is printed.",
        "foundhint-local-seo",
      );
    case "page_general":
      return sprintf(
        /* translators: %s: page title. */
        __(
          "“%s” is a general page. A page about only this service works better.",
          "foundhint-local-seo",
        ),
        warning.page || __("This page", "foundhint-local-seo"),
      );
    case "page_shared":
      return sprintf(
        /* translators: %s: other service names. */
        __(
          "%s already uses this page. Each service works best on its own page.",
          "foundhint-local-seo",
        ),
        (warning.services ?? []).join(", "),
      );
    case "page_unpublished":
      return __(
        "This page isn't published, so nothing will show.",
        "foundhint-local-seo",
      );
    case "page_other_host":
      return __(
        "This URL is on another site. Schema here can't describe it.",
        "foundhint-local-seo",
      );
    case "page_not_canonical":
      return sprintf(
        /* translators: %s: the page's own address. */
        __(
          "This page's own address is %s. Use that instead.",
          "foundhint-local-seo",
        ),
        warning.canonical,
      );
    case "no_pages":
      return __(
        "No pages chosen yet, so this service prints nowhere.",
        "foundhint-local-seo",
      );
    case "branch_off":
      return sprintf(
        /* translators: %s: branch name. */
        __(
          "%s is switched off in Location schema, so the service points at a branch that isn't printed.",
          "foundhint-local-seo",
        ),
        warning.branch,
      );
    default:
      return warning.code;
  }
}

function metaLine(service) {
  return [
    service.meta?.category,
    service.meta?.provider,
    service.meta?.areas
      ? sprintf(
          /* translators: %d: number of areas. */
          _n("%d area", "%d areas", service.meta.areas, "foundhint-local-seo"),
          service.meta.areas,
        )
      : null,
    service.meta?.page || __("No page", "foundhint-local-seo"),
  ]
    .filter(Boolean)
    .join(" · ");
}

const iconButton = cn(
  "fhint:inline-flex fhint:cursor-pointer fhint:items-center fhint:justify-center fhint:border fhint:border-[#e6e3e3] fhint:bg-card fhint:p-1 fhint:text-[#625e5e] disabled:fhint:cursor-default disabled:fhint:opacity-40",
  focus,
);

/**
 * 03 Service schema — the list (doc §7.1): one row per service, with its
 * checks, a switch that saves at once, and an order that drives the output.
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
  const [open, setOpen] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [setStatus] = useSetServiceStatusMutation();
  const [reorder] = useReorderServiceSchemasMutation();
  const active = services.filter(
    (service) => service.status !== "inactive",
  ).length;
  const canAdd = !locked && (limits?.can_add ?? true);

  const move = async (from, to) => {
    if (to < 0 || to >= services.length || from === to) {
      return;
    }

    const ids = services.map((service) => service.id);
    const [id] = ids.splice(from, 1);

    ids.splice(to, 0, id);

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
        on
          ? sprintf(
              /* translators: %s: service name. */
              __("%s is published.", "foundhint-local-seo"),
              service.name,
            )
          : sprintf(
              /* translators: %s: service name. */
              __("%s is off your site.", "foundhint-local-seo"),
              service.name,
            ),
      );
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <section
      aria-labelledby="fhint-schema-services-title"
      className={cn(panel, "fhint:min-w-0")}
    >
      <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3 fhint:border-b fhint:border-b-[#e6e3e3] fhint:px-5 fhint:py-4">
        <span className="fhint:flex fhint:min-w-0 fhint:flex-[1_1_260px] fhint:items-center fhint:gap-2">
          <h2
            id="fhint-schema-services-title"
            className="fhint:m-0 fhint:text-[16px] fhint:font-bold"
          >
            {__("Service schema", "foundhint-local-seo")}
          </h2>
          <Hint
            about={__("Service schema", "foundhint-local-seo")}
            text={__(
              "Each service you offer, linked to the business or branch that provides it. It never creates a second business.",
              "foundhint-local-seo",
            )}
          />
        </span>
        {locked ? null : (
          <span className="fhint:flex fhint:items-center fhint:gap-2">
            {!canAdd && limits ? (
              <span className={muted}>
                {sprintf(
                  /* translators: 1: services used, 2: plan limit. */
                  __("%1$d of %2$d on your plan", "foundhint-local-seo"),
                  limits.used,
                  limits.limit,
                )}
              </span>
            ) : null}
            <button
              type="button"
              onClick={onAdd}
              disabled={!canAdd}
              className={primary(canAdd)}
            >
              <PlusIcon aria-hidden="true" className="fhint:size-4" />
              {__("Add a service", "foundhint-local-seo")}
            </button>
          </span>
        )}
      </div>

      <div className="fhint:flex fhint:flex-wrap fhint:items-baseline fhint:gap-2 fhint:border-b fhint:border-b-[#f0eeee] fhint:px-5 fhint:py-2.5">
        <span className="fhint:text-[11.5px] fhint:font-bold fhint:tracking-[0.06em] fhint:text-[#625e5e] fhint:uppercase">
          {__("Services offered", "foundhint-local-seo")}
        </span>
        {list && branchName ? (
          <span className="fhint:text-[12.5px] fhint:font-bold">
            {branchName}
          </span>
        ) : null}
        <span className={muted}>
          {sprintf(
            /* translators: 1: active services, 2: inactive services. */
            __("%1$d active · %2$d inactive", "foundhint-local-seo"),
            active,
            services.length - active,
          )}
        </span>
      </div>

      {!services.length ? (
        <p className={cn(muted, "fhint:m-0 fhint:px-5 fhint:py-5")}>
          {locked
            ? __(
                "No services yet. Add them on your Business Profile screen.",
                "foundhint-local-seo",
              )
            : list
              ? sprintf(
                  /* translators: %s: branch name. */
                  __(
                    "%s has no services of its own yet. Add one here, or choose your main location at the top to see your business's services.",
                    "foundhint-local-seo",
                  ),
                  branchName || __("This branch", "foundhint-local-seo"),
                )
              : __(
                  "No services yet. Add the first one.",
                  "foundhint-local-seo",
                )}
        </p>
      ) : (
        <ul
          className="fhint:m-0 fhint:list-none fhint:p-0"
          aria-label={__("Services", "foundhint-local-seo")}
        >
          {services.map((service, index) => {
            const on = service.status !== "inactive";
            const current = service.id === selected;
            const checks = service.warnings ?? [];
            const expanded = open === service.id;

            return (
              <li
                key={service.id}
                draggable={!locked}
                onDragStart={(event) => {
                  setDragging(index);
                  event.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(event) => {
                  if (dragging !== null) {
                    event.preventDefault();
                  }
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  move(dragging, index);
                  setDragging(null);
                }}
                onDragEnd={() => setDragging(null)}
                className={cn(
                  "fhint:border-b fhint:border-b-[#f0eeee] fhint:last:border-b-0",
                  current && "fhint:bg-[#FFF8F4]",
                  dragging === index && "fhint:opacity-50",
                )}
              >
                <div className="fhint:flex fhint:items-center fhint:gap-2 fhint:px-3 fhint:py-2.5">
                  {locked ? null : (
                    <span className="fhint:flex fhint:items-center fhint:gap-1">
                      <GripVerticalIcon
                        aria-hidden="true"
                        className="fhint:size-4 fhint:cursor-grab fhint:text-[#bab6b6]"
                      />
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => move(index, index - 1)}
                        aria-label={sprintf(
                          /* translators: %s: service name. */
                          __("Move %s up", "foundhint-local-seo"),
                          service.name,
                        )}
                        className={iconButton}
                      >
                        <ArrowUpIcon
                          aria-hidden="true"
                          className="fhint:size-3.5"
                        />
                      </button>
                      <button
                        type="button"
                        disabled={index === services.length - 1}
                        onClick={() => move(index, index + 1)}
                        aria-label={sprintf(
                          /* translators: %s: service name. */
                          __("Move %s down", "foundhint-local-seo"),
                          service.name,
                        )}
                        className={iconButton}
                      >
                        <ArrowDownIcon
                          aria-hidden="true"
                          className="fhint:size-3.5"
                        />
                      </button>
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => onPick(service.id)}
                    aria-current={current ? "true" : undefined}
                    className={cn(
                      "fhint:grid fhint:min-w-0 fhint:flex-1 fhint:cursor-pointer fhint:gap-0.5 fhint:border-0 fhint:bg-transparent fhint:p-1 fhint:text-left",
                      !on && "fhint:opacity-60",
                      focus,
                    )}
                  >
                    <span className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-1.5">
                      <strong className="fhint:text-[13.5px]">
                        {service.name}
                      </strong>
                      {service.from_google ? (
                        <span className={cn(pill, BADGES.google)}>
                          {__("From Google", "foundhint-local-seo")}
                        </span>
                      ) : null}
                    </span>
                    <span className="fhint:truncate fhint:text-[12px] fhint:text-[#625e5e]">
                      {metaLine(service)}
                    </span>
                  </button>

                  {on && checks.length ? (
                    <button
                      type="button"
                      aria-expanded={expanded}
                      onClick={() => setOpen(expanded ? null : service.id)}
                      className={cn(
                        pill,
                        "fhint:cursor-pointer fhint:border-0 fhint:bg-[#FBF0DE] fhint:text-[#8a5a00]",
                        focus,
                      )}
                    >
                      {sprintf(
                        /* translators: %d: number of things to check. */
                        _n(
                          "%d to check",
                          "%d to check",
                          checks.length,
                          "foundhint-local-seo",
                        ),
                        checks.length,
                      )}
                    </button>
                  ) : null}

                  <span className="fhint:hidden fhint:w-[52px] fhint:text-right fhint:text-[12px] fhint:text-[#625e5e] fhint:sm:inline">
                    {on
                      ? __("Active", "foundhint-local-seo")
                      : __("Inactive", "foundhint-local-seo")}
                  </span>
                  <Switch
                    checked={on}
                    disabled={locked}
                    onCheckedChange={(next) => toggle(service, next)}
                    aria-label={sprintf(
                      /* translators: %s: service name. */
                      __("Publish %s", "foundhint-local-seo"),
                      service.name,
                    )}
                  />
                </div>

                {expanded ? (
                  <ul className="fhint:m-0 fhint:grid fhint:list-none fhint:gap-1 fhint:px-5 fhint:pb-3 fhint:pl-[92px]">
                    {checks.map((warning) => (
                      <li
                        key={`${warning.code}-${warning.branch ?? ""}`}
                        className="fhint:text-[12.5px] fhint:text-[#5c3d00]"
                      >
                        {warningText(warning)}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default ServiceList;
