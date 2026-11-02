import { help } from "@/pages/profile/styles";
import { cn } from "cn";
import { useId } from "react";
import {
  panel,
  panelChip,
  panelHeader,
  panelTitle,
} from "@/pages/schema/components/styles";

/**
 * A card drawn as a Business Profile section: an icon, the title (with an
 * optional line under it) and its chip over the heavier 2px rule, then the
 * body. Reviews and Posts & Scheduling build their screens from it.
 *
 * A panel with no children is its heading row alone.
 *
 * @param {Object}                    props
 * @param {import('react').ElementType} [props.icon]  Lucide icon.
 * @param {string}                    props.title
 * @param {string}                    [props.description] A line under the title.
 * @param {import('react').ReactNode} [props.after]   Beside the title: a hint or a tag.
 * @param {string}                    [props.chip]    The count beside the title.
 * @param {import('react').ReactNode} [props.actions] Right-aligned in the heading row.
 * @param {string}                    [props.bodyClassName]
 */
export function Panel({
  icon: Icon,
  title,
  after,
  chip,
  actions,
  description,
  bodyClassName,
  children,
}) {
  const id = useId();

  return (
    <section aria-labelledby={id} className={panel}>
      {/* One fixed height for every panel's heading row, so the list and
          the sidebar beside it line up whether or not a row has a button.
          A heading row alone drops its rule: the panel's own bottom edge
          closes it, and both together drew a double line. */}
      <div
        className={cn(
          panelHeader,
          "fhint:box-border fhint:min-h-16 fhint:py-2",
          children ? null : "fhint:border-b-0",
        )}
      >
        {Icon ? (
          <span
            aria-hidden="true"
            className="fhint:grid fhint:size-5.5 fhint:flex-none fhint:place-items-center fhint:text-muted-strong"
          >
            <Icon className="fhint:size-4" />
          </span>
        ) : null}
        {description ? (
          <div className="fhint:grid fhint:min-w-0 fhint:flex-1 fhint:gap-0.5">
            <div className="fhint:flex fhint:items-center fhint:gap-2">
              <h2 id={id} className={panelTitle}>
                {title}
              </h2>
              {after}
            </div>
            <p aria-live="polite" className={cn(help, "fhint:m-0")}>
              {description}
            </p>
          </div>
        ) : (
          <>
            <h2 id={id} className={panelTitle}>
              {title}
            </h2>
            {after}
          </>
        )}
        {chip ? (
          <span aria-live="polite" className={panelChip}>
            {chip}
          </span>
        ) : null}
        {actions ? (
          <div className="fhint:ml-auto fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2">
            {actions}
          </div>
        ) : null}
      </div>
      {children ? (
        <div className={cn("fhint:grid fhint:gap-5 fhint:p-5", bodyClassName)}>
          {children}
        </div>
      ) : null}
    </section>
  );
}

export default Panel;
