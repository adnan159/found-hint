import { useEffect, useRef } from "react";
import { __, sprintf } from "@wordpress/i18n";
import { cn } from "cn";
import { SparklesIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { focus } from "@/pages/profile/styles";
import { SWITCHED, TABS } from "../../lib/tabs";

export { TABS, SWITCHED };

/**
 * The schema tabs, each with its number, title, a live one-line summary and
 * what it describes. The chosen one: an accent rule along its bottom.
 * The tab list lives in `lib/tabs`.
 *
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
  const bar = useRef(null);

  // Keep the open tab in sight when the row scrolls.
  useEffect(() => {
    bar.current
      ?.querySelector("[data-current]")
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [current]);

  return (
    <nav
      aria-label={__("Schema sections", "foundhint-local-seo")}
      ref={bar}
      // One row, always: on a narrow screen the row scrolls sideways
      // instead of wrapping. A 1px gap over the border colour draws the
      // dividers.
      className="fhint:grid fhint:snap-x fhint:auto-cols-[minmax(190px,1fr)] fhint:grid-flow-col fhint:gap-px fhint:overflow-x-auto fhint:overscroll-x-contain fhint:border fhint:border-border fhint:bg-border"
    >
      {TABS.map(([key, title, description], index) => {
        const on = key === current;
        const unsaved = dirty && on;
        const switched = SWITCHED.includes(key);
        const off = switched && enabled[key] === false;
        const premium = summaries.premium?.[key];

        return (
          <div
            key={key}
            data-current={on || undefined}
            className={cn(
              "fhint:relative fhint:flex fhint:min-w-0 fhint:snap-start fhint:transition-colors",
              // Every tab is white; the chosen one has an accent rule along
              // its bottom.
              "fhint:bg-card",
              on
                ? "fhint:shadow-[inset_0_-3px_0_var(--primary)]"
                : "fhint:hover:bg-muted/50",
            )}
          >
            <button
              type="button"
              aria-current={on ? "page" : undefined}
              onClick={() => onPick(key)}
              className={cn(
                "fhint:grid fhint:min-w-0 fhint:flex-1 fhint:cursor-pointer fhint:content-start fhint:gap-1 fhint:border-0 fhint:bg-transparent fhint:pt-4 fhint:pb-3.5 fhint:pl-4 fhint:text-left fhint:text-foreground",
                switched && !premium ? "fhint:pr-14" : "fhint:pr-3",
                focus,
              )}
            >
              {/* "01 Organization", and a Premium tab's badge at the right. */}
              <span className="fhint:flex fhint:min-w-0 fhint:items-center fhint:gap-2">
                <span
                  className={cn(
                    "fhint:text-sm fhint:leading-5 fhint:font-bold fhint:tabular-nums",
                    on ? "fhint:text-primary" : "fhint:text-muted-foreground",
                  )}
                >
                  {`0${index + 1}`}
                </span>
                <strong
                  className={cn(
                    "fhint:min-w-0 fhint:truncate fhint:text-sm fhint:leading-5",
                    off && "fhint:text-muted-strong",
                  )}
                >
                  {title()}
                </strong>
                {premium ? (
                  <span className="fhint:ml-auto fhint:inline-flex fhint:shrink-0 fhint:items-center fhint:gap-1 fhint:rounded-full fhint:border fhint:border-[#F5C2AD] fhint:bg-card fhint:px-2 fhint:py-0.5 fhint:text-[11px] fhint:font-bold fhint:text-[#B8441A]">
                    <SparklesIcon aria-hidden="true" className="fhint:size-3" />
                    {summaries[key]}
                  </span>
                ) : null}
              </span>
              {premium ? null : (
                <span
                  className={cn(
                    "fhint:text-[13px] fhint:text-muted-strong",
                    unsaved && "fhint:font-bold fhint:text-foreground",
                  )}
                >
                  {unsaved
                    ? __("Unsaved changes", "foundhint-local-seo")
                    : off
                      ? (summaries.offText?.[key] ??
                        __("Off · not printed", "foundhint-local-seo"))
                      : summaries[key]}
                </span>
              )}
              <span className="fhint:mt-1 fhint:border-t fhint:border-t-border fhint:pt-2 fhint:text-[12.5px] fhint:leading-snug fhint:text-muted-foreground">
                {description()}
              </span>
            </button>

            {switched && !premium && enabled[key] !== undefined ? (
              <span className="fhint:absolute fhint:top-3.5 fhint:right-3">
                <Switch
                  checked={!off}
                  disabled={locked}
                  onCheckedChange={(next) => onToggle?.(key, next)}
                  aria-label={sprintf(
                    /* translators: %s: a schema tab, e.g. "Organization". */
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
