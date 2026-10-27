import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { focus, smallInput } from "@/pages/profile/styles";

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
 * Type tabs with their counts, then status, time, source and order.
 */
export function PostFilters({ filters, counts, onChange }) {
  return (
    <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3 fhint:border-b fhint:border-b-border fhint:px-4 fhint:py-3">
      <div
        role="tablist"
        aria-label={__("Post type", "foundhint-local-seo")}
        className="fhint:inline-flex fhint:gap-1 fhint:bg-muted fhint:p-1"
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
                "fhint:inline-flex fhint:cursor-pointer fhint:items-center fhint:gap-2 fhint:border-0 fhint:px-3 fhint:py-1.5 fhint:text-[12.5px] fhint:font-extrabold",
                on
                  ? "fhint:bg-card fhint:text-foreground fhint:shadow-sm"
                  : "fhint:bg-transparent fhint:text-muted-strong",
                focus,
              )}
            >
              {text()}
              <span
                className={cn(
                  "fhint:min-w-5 fhint:rounded-full fhint:px-1.5 fhint:text-[11px] fhint:leading-[18px]",
                  on
                    ? "fhint:bg-primary fhint:text-primary-foreground"
                    : "fhint:bg-card fhint:text-muted-strong",
                )}
              >
                {counts?.[key] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      <div className="fhint:ml-auto fhint:flex fhint:flex-wrap fhint:gap-2">
        {selects().map(([key, name, options]) => (
          <select
            key={key}
            aria-label={name}
            value={String(filters[key])}
            onChange={(event) =>
              onChange({ ...filters, [key]: event.target.value })
            }
            className={cn(smallInput, "fhint:min-w-[120px] fhint:pr-7!")}
          >
            {options.map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </select>
        ))}
      </div>
    </div>
  );
}

export default PostFilters;
