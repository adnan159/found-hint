import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { focus } from "@/pages/profile/styles";

/**
 * The five steps, each with its number, title and a live one-line summary.
 * The chosen one: an accent rule along its bottom edge.
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
      className="fhint:grid fhint:grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] fhint:border fhint:border-border fhint:bg-card"
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
              "fhint:grid fhint:cursor-pointer fhint:gap-0.5 fhint:border-0 fhint:border-r fhint:border-r-border fhint:bg-card fhint:px-4 fhint:py-[13px] fhint:text-left fhint:text-foreground",
              // The chosen tab: an accent rule along its bottom edge.
              on && "fhint:shadow-[inset_0_-3px_0_var(--primary)]",
              focus,
            )}
          >
            <span
              className={cn(
                "fhint:text-[11.5px] fhint:font-bold fhint:tracking-[0.06em]",
                "fhint:text-muted-foreground",
              )}
            >
              {`0${index + 1}`}
            </span>
            <strong className="fhint:text-[14px]">{title()}</strong>
            <span
              className={cn(
                "fhint:text-[12.5px]",
                "fhint:text-muted-strong",
                unsaved && "fhint:font-bold",
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
