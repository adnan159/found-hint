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
                ? "fhint:border-[#FF6B35] fhint:bg-[#FFF8F4] fhint:shadow-[0_0_0_1px_#FF6B35]"
                : "fhint:border-[#d7d3d3]",
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
            <span className="fhint:text-[12px] fhint:text-[#625e5e]">
              {pagesLine(branch)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default BranchButtons;
