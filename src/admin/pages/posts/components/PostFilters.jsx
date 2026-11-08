import { useId } from "react";
import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { focus, input, label, tag, tagTones } from "@/pages/profile/styles";

const TABS = [
  ["", () => __("All", "foundhint-local-seo"), "all"],
  ["update", () => __("Updates", "foundhint-local-seo"), "update"],
  ["event", () => __("Events", "foundhint-local-seo"), "event"],
  ["offer", () => __("Offers", "foundhint-local-seo"), "offer"],
];

function selects() {
  return [
    [
      "status",
      __("Status", "foundhint-local-seo"),
      [
        ["", __("All statuses", "foundhint-local-seo")],
        ["live", __("Live", "foundhint-local-seo")],
        ["scheduled", __("Scheduled", "foundhint-local-seo")],
        ["draft", __("Draft", "foundhint-local-seo")],
        ["failed", __("Failed", "foundhint-local-seo")],
      ],
    ],
    [
      "days",
      __("Time", "foundhint-local-seo"),
      [
        ["0", __("Any time", "foundhint-local-seo")],
        ["7", __("Last 7 days", "foundhint-local-seo")],
        ["30", __("Last 30 days", "foundhint-local-seo")],
        ["90", __("Last 90 days", "foundhint-local-seo")],
      ],
    ],
    [
      "source",
      __("Source", "foundhint-local-seo"),
      [
        ["", __("All sources", "foundhint-local-seo")],
        ["manual", __("Written by you", "foundhint-local-seo")],
        ["review", __("From a review", "foundhint-local-seo")],
      ],
    ],
    [
      "sort",
      __("Order", "foundhint-local-seo"),
      [
        ["new", __("Newest first", "foundhint-local-seo")],
        ["old", __("Oldest first", "foundhint-local-seo")],
      ],
    ],
  ];
}

/**
 * The type tabs with their counts — underlined in the accent like the
 * reply templates' star tabs — then status, time, source and order as
 * labelled fields, as the Reviews filters are.
 *
 * @param {Object}   props
 * @param {Object}   props.filters  `{ type, status, days, source, sort }`.
 * @param {Object}   [props.counts] Posts per type: `{ all, update, … }`.
 * @param {Function} props.onChange Receives the changed filters.
 */
export function PostFilters({ filters, counts, onChange }) {
  const id = useId();

  return (
    <div className="fhint:grid fhint:gap-5">
      <div
        role="tablist"
        aria-label={__("Post type", "foundhint-local-seo")}
        className="fhint:flex fhint:flex-wrap fhint:border-b fhint:border-b-border"
      >
        {TABS.map(([value, text, key]) => {
          const on = filters.type === value;

          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onChange({ ...filters, type: value })}
              className={cn(
                "fhint:-mb-px fhint:inline-flex fhint:cursor-pointer fhint:items-center fhint:gap-2 fhint:border-0 fhint:border-b-2 fhint:bg-transparent fhint:px-3 fhint:pt-1 fhint:pb-2.5 fhint:text-sm fhint:leading-none fhint:font-extrabold fhint:transition-colors",
                on
                  ? "fhint:border-b-primary fhint:text-foreground"
                  : "fhint:border-b-transparent fhint:text-muted-strong fhint:hover:border-b-border fhint:hover:text-foreground",
                focus,
              )}
            >
              {text()}
              <span
                className={cn(
                  tag,
                  "fhint:rounded-full",
                  on ? tagTones.accent : tagTones.quiet,
                )}
              >
                {counts?.[key] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      <div className="fhint:grid fhint:grid-cols-1 fhint:gap-3 fhint:sm:grid-cols-2 fhint:xl:grid-cols-4">
        {selects().map(([key, name, options]) => (
          <div key={key} className="fhint:grid fhint:min-w-0 fhint:gap-1.5">
            <label htmlFor={`${id}-${key}`} className={label}>
              {name}
            </label>
            <select
              id={`${id}-${key}`}
              value={String(filters[key])}
              onChange={(event) =>
                onChange({ ...filters, [key]: event.target.value })
              }
              className={input}
            >
              {options.map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PostFilters;
