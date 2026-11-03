import { useId } from "react";
import { cn } from "cn";
import { GROUP_ICONS } from "../../lib/groupIcons";
import { panel, panelHeader, panelTitle } from "../styles";

/**
 * One group of fields as a card, built like a Business Profile section:
 * an icon and the title over the heavy 2px rule, then the fields on a grid
 * with the profile's padding (20px) and spacing (18px).
 *
 * @param {Object} props
 * @param {string} props.group  The group's key: picks its icon.
 * @param {string} props.title
 * @param {string} [props.grid] The grid's column classes.
 * @param {*}      props.children
 */
export function FieldGroup({ group, title, grid, children }) {
  const id = useId();
  const Icon = GROUP_ICONS[group];

  return (
    <section aria-labelledby={id} className={cn(panel, "fhint:min-w-0")}>
      <div className={panelHeader}>
        {Icon ? (
          <span
            aria-hidden="true"
            className="fhint:grid fhint:size-5.5 fhint:flex-none fhint:place-items-center fhint:text-muted-strong"
          >
            <Icon className="fhint:size-4" />
          </span>
        ) : null}
        <h3 id={id} className={panelTitle}>
          {title}
        </h3>
      </div>
      <div
        className={cn(
          "fhint:grid fhint:grid-cols-1 fhint:gap-4.5 fhint:p-5",
          grid,
        )}
      >
        {children}
      </div>
    </section>
  );
}

export default FieldGroup;
