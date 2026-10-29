import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { focus } from "@/pages/profile/styles";
import { pagesLine } from "../../lib/location";

/**
 * The branches as buttons — name, and where each prints. The chosen one is
 * pressed; one switched off is dimmed.
 *
 * @param {Object}   props
 * @param {Object[]} props.branches
 * @param {number}   [props.current] The chosen branch, if any.
 * @param {Function} props.onPick    Receives a branch id.
 */
export function BranchButtons({ branches, current, onPick }) {
  return (
    <div
      className="fhint:flex fhint:flex-wrap fhint:gap-2"
      role="group"
      aria-label={__("Branches", "foundhint-local-seo")}
    >
      {branches.map((branch) => {
        const on = branch.id === current;

        return (
          <button
            key={branch.id}
            type="button"
            aria-pressed={current === undefined ? undefined : on}
            onClick={() => onPick(branch.id)}
            className={cn(
              "fhint:cursor-pointer fhint:border fhint:bg-card fhint:px-3 fhint:py-2 fhint:text-left",
              on
                ? "fhint:border-primary fhint:bg-notice fhint:shadow-[0_0_0_1px_var(--primary)]"
                : "fhint:border-input",
              current !== undefined &&
                branch.status === "inactive" &&
                !on &&
                "fhint:opacity-60",
              focus,
            )}
          >
            <strong className="fhint:block fhint:text-[13.5px]">
              {branch.name}
            </strong>
            <span className="fhint:text-[12.5px] fhint:text-muted-strong">
              {pagesLine(branch)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default BranchButtons;
