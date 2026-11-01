import { __, sprintf } from "@wordpress/i18n";
import { cn } from "cn";
import { Switch } from "@/components/ui/switch";
import { focus } from "@/pages/profile/styles";

/**
 * The schema tabs, each with its number, title and a live one-line summary.
 * The chosen one: an accent rule along its bottom edge.
 *
 * Organization (the brand) and LocalBusiness (the place) are separate tabs.
 * Each schema tab has a switch: on prints its schema; off keeps every
 * detail and prints nothing. Settings has none.
 */
export const TABS = [
  ["organization", () => __("Organization schema", "foundhint-local-seo")],
  ["localbusiness", () => __("LocalBusiness schema", "foundhint-local-seo")],
  ["locations", () => __("Location schema", "foundhint-local-seo")],
  ["services", () => __("Service schema", "foundhint-local-seo")],
  ["website", () => __("Website structure", "foundhint-local-seo")],
  ["settings", () => __("Settings", "foundhint-local-seo")],
];

/** Tabs with an on/off switch. */
export const SWITCHED = [
  "organization",
  "localbusiness",
  "locations",
  "services",
  "website",
];

/**
 * @param {Object}   props
 * @param {string}   props.current   The open tab.
 * @param {Object}   props.summaries Summary text by tab.
 * @param {boolean}  props.dirty     The open tab has unsaved changes.
 * @param {Object}   props.enabled   Switch state by tab; missing = unknown.
 * @param {boolean}  props.locked    Switches can't be changed (no Premium).
 * @param {Function} props.onPick    Open a tab.
 * @param {Function} props.onToggle  `(key, on)`: switch a tab.
 */
export function TabBar({
  current,
  summaries,
  dirty,
  enabled = {},
  locked,
  onPick,
  onToggle,
}) {
  return (
    <nav
      aria-label={__("Schema sections", "foundhint-local-seo")}
      className="fhint:grid fhint:grid-cols-[repeat(auto-fit,minmax(min(100%,170px),1fr))] fhint:border fhint:border-border fhint:bg-card"
    >
      {TABS.map(([key, title], index) => {
        const on = key === current;
        const unsaved = dirty && on;
        const switched = SWITCHED.includes(key);
        const off = switched && enabled[key] === false;

        return (
          <div
            key={key}
            className={cn(
              "fhint:relative fhint:flex fhint:min-w-0 fhint:border-r fhint:border-r-border fhint:bg-card",
              // The chosen tab: an accent rule along its bottom edge.
              on && "fhint:shadow-[inset_0_-3px_0_var(--primary)]",
            )}
          >
            <button
              type="button"
              aria-current={on ? "page" : undefined}
              onClick={() => onPick(key)}
              className={cn(
                "fhint:grid fhint:min-w-0 fhint:flex-1 fhint:cursor-pointer fhint:gap-0.5 fhint:border-0 fhint:bg-transparent fhint:py-[13px] fhint:pl-4 fhint:text-left fhint:text-foreground",
                switched ? "fhint:pr-14" : "fhint:pr-4",
                focus,
              )}
            >
              <span className="fhint:text-[11.5px] fhint:font-bold fhint:tracking-[0.06em] fhint:text-muted-foreground">
                {`0${index + 1}`}
              </span>
              <strong
                className={cn(
                  "fhint:text-sm",
                  off && "fhint:text-muted-strong",
                )}
              >
                {title()}
              </strong>
              <span
                className={cn(
                  "fhint:text-sm",
                  "fhint:text-muted-strong",
                  unsaved && "fhint:font-bold",
                )}
              >
                {unsaved
                  ? __("Unsaved changes", "foundhint-local-seo")
                  : off
                    ? (summaries.offText?.[key] ??
                      __("Off · not printed", "foundhint-local-seo"))
                    : summaries[key]}
              </span>
            </button>

            {switched && enabled[key] !== undefined ? (
              <span className="fhint:absolute fhint:top-3 fhint:right-3">
                <Switch
                  checked={!off}
                  disabled={locked}
                  onCheckedChange={(next) => onToggle?.(key, next)}
                  aria-label={sprintf(
                    /* translators: %s: a schema tab, e.g. "Organization schema". */
                    __("Publish %s", "foundhint-local-seo"),
                    title(),
                  )}
                />
              </span>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

export default TabBar;
