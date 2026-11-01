import { Switch } from "@/components/ui/switch";
import { focus } from "@/pages/profile/styles";
import { __, _n, sprintf } from "@wordpress/i18n";
import { cn } from "cn";
import { ArrowDownIcon, ArrowUpIcon, GripVerticalIcon } from "lucide-react";
import { serviceMetaLine, warningText } from "../../../lib/service";
import { PILL_TONES, ROW_PILL } from "../pills";

const iconButton = cn(
  "fhint:inline-flex fhint:cursor-pointer fhint:items-center fhint:justify-center fhint:border fhint:border-border fhint:bg-card fhint:p-1 fhint:text-muted-strong fhint:disabled:cursor-default fhint:disabled:opacity-40",
  focus,
);

/**
 * One service in the list: drag handle and up/down, its name and details
 * (opens the editor), its checks, and a switch that publishes at once.
 *
 * Dragging is the mouse's way to reorder; the arrows are everyone's.
 *
 * @param {Object}   props
 * @param {Object}   props.service
 * @param {boolean}  props.first, props.last  Position, for the arrows.
 * @param {boolean}  props.current   Open in the editor.
 * @param {boolean}  props.expanded  Its checks are shown.
 * @param {boolean}  props.dragged   Being dragged.
 * @param {boolean}  props.locked
 * @param {Object}   props.drag      Drag handlers for the row.
 * @param {Function} props.onMove    Receives -1 (up) or 1 (down).
 * @param {Function} props.onPick
 * @param {Function} props.onExpand
 * @param {Function} props.onToggle  Receives the new on/off.
 */
export function ServiceRow({
  service,
  first,
  last,
  current,
  expanded,
  dragged,
  locked,
  drag,
  onMove,
  onPick,
  onExpand,
  onToggle,
}) {
  const on = service.status !== "inactive";
  const checks = service.warnings ?? [];
  const name = service.name;

  return (
    <li
      draggable={!locked}
      {...drag}
      className={cn(
        "fhint:border-b fhint:border-b-[#f0eeee] fhint:last:border-b-0",
        current
          ? "fhint:bg-[#FFF8F4] fhint:shadow-[inset_3px_0_0_#FF6B35]"
          : "fhint:bg-white",
        dragged && "fhint:opacity-50",
      )}
    >
      <div
        className={cn(
          "fhint:flex fhint:items-center fhint:gap-3 fhint:px-3.5 fhint:py-[11px]",
          !on && "fhint:opacity-70",
        )}
      >
        {locked ? null : (
          <span className="fhint:flex fhint:items-center fhint:gap-1">
            <GripVerticalIcon
              aria-hidden="true"
              className="fhint:size-4 fhint:cursor-grab fhint:text-muted-foreground"
            />
            <button
              type="button"
              disabled={first}
              onClick={() => onMove(-1)}
              aria-label={sprintf(
                /* translators: %s: service name. */
                __("Move %s up", "foundhint-local-seo"),
                name,
              )}
              className={iconButton}
            >
              <ArrowUpIcon aria-hidden="true" className="fhint:size-3.5" />
            </button>
            <button
              type="button"
              disabled={last}
              onClick={() => onMove(1)}
              aria-label={sprintf(
                /* translators: %s: service name. */
                __("Move %s down", "foundhint-local-seo"),
                name,
              )}
              className={iconButton}
            >
              <ArrowDownIcon aria-hidden="true" className="fhint:size-3.5" />
            </button>
          </span>
        )}

        <button
          type="button"
          onClick={onPick}
          aria-current={current ? "true" : undefined}
          className={cn(
            "fhint:grid fhint:min-w-0 fhint:flex-1 fhint:cursor-pointer fhint:gap-0.5 fhint:border-0 fhint:bg-transparent fhint:p-0 fhint:text-left fhint:text-[#201e1d]",
            focus,
          )}
        >
          <span className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-1.5">
            <strong className="fhint:text-sm">{name}</strong>
            {service.from_google ? (
              <span className={cn(ROW_PILL, PILL_TONES.google)}>
                {__("From Google", "foundhint-local-seo")}
              </span>
            ) : null}
          </span>
          <span className="fhint:truncate fhint:text-sm fhint:text-muted-strong">
            {serviceMetaLine(service)}
          </span>
        </button>

        {on && checks.length ? (
          <button
            type="button"
            aria-expanded={expanded}
            onClick={onExpand}
            className={cn(
              ROW_PILL,
              PILL_TONES.warn,
              "fhint:cursor-pointer fhint:border-0",
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

        <span className="fhint:hidden fhint:w-[52px] fhint:text-right fhint:text-sm fhint:text-muted-strong fhint:sm:inline">
          {on
            ? __("Active", "foundhint-local-seo")
            : __("Inactive", "foundhint-local-seo")}
        </span>
        <Switch
          checked={on}
          disabled={locked}
          onCheckedChange={onToggle}
          aria-label={sprintf(
            /* translators: %s: service name. */
            __("Publish %s", "foundhint-local-seo"),
            name,
          )}
        />
      </div>

      {expanded ? (
        <ul className="fhint:m-0 fhint:grid fhint:list-none fhint:gap-1 fhint:px-5 fhint:pb-3 fhint:pl-[92px]">
          {checks.map((warning) => (
            <li
              key={`${warning.code}-${warning.branch ?? ""}`}
              className="fhint:text-sm fhint:text-warning-foreground"
            >
              {warningText(warning)}
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export default ServiceRow;
