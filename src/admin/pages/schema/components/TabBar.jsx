import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { focus } from "@/pages/profile/styles";

/**
 * The five steps, each with its number, title and a live one-line summary.
 * The chosen one: warm tint and an orange underline.
 */
export const TABS = [
  ["business", () => __("Business schema", "foundhint-local-seo")],
  ["locations", () => __("Location schema", "foundhint-local-seo")],
  ["services", () => __("Service schema", "foundhint-local-seo")],
  ["website", () => __("Website structure", "foundhint-local-seo")],
  ["settings", () => __("Settings", "foundhint-local-seo")],
];

export function TabBar({ current, summaries, dirty, onPick }) {
  return (
    <nav
      aria-label={__("Schema sections", "foundhint-local-seo")}
      className="fhint:grid fhint:grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] fhint:border fhint:border-[#e6e3e3] fhint:bg-card"
    >
      {TABS.map(([key, title], index) => {
        const on = key === current;
        const unsaved = dirty && on;

        return (
          <button
            key={key}
            type="button"
            aria-current={on ? "page" : undefined}
            onClick={() => onPick(key)}
            className={cn(
              "fhint:grid fhint:cursor-pointer fhint:gap-0.5 fhint:border-0 fhint:border-r fhint:border-r-[#f0eeee] fhint:px-4 fhint:py-[13px] fhint:text-left fhint:text-[#201e1d]",
              on
                ? "fhint:bg-[#FFF8F4] fhint:shadow-[inset_0_-3px_0_#FF6B35]"
                : "fhint:bg-card",
              focus,
            )}
          >
            <span className="fhint:text-[11.5px] fhint:font-bold fhint:tracking-[0.06em] fhint:text-[#9b9797]">
              {`0${index + 1}`}
            </span>
            <strong className="fhint:text-[14px]">{title()}</strong>
            <span
              className={cn(
                "fhint:text-[12px]",
                unsaved ? "fhint:text-[#8a5a00]" : "fhint:text-[#625e5e]",
              )}
            >
              {unsaved
                ? __("Unsaved changes", "foundhint-local-seo")
                : summaries[key]}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export default TabBar;
