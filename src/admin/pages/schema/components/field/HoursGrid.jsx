import { __ } from "@wordpress/i18n";
import { cn } from "cn";

/**
 * The week, read-only: hours come from the Business Profile, and the way to
 * change them is to change them there.
 */
export function HoursGrid({ hours }) {
  const days = hours?.days ?? [];

  if (!days.length) {
    return (
      <span className="fhint:text-[13px] fhint:text-muted-strong">
        {__("No opening hours yet.", "foundhint-local-seo")}
      </span>
    );
  }

  return (
    // The whole week on one row on a wide screen; wrapping below that. Each
    // day reaches 1px past its cell and the list clips it, so the days' own
    // right and bottom rules vanish under the outer border at the edges
    // instead of doubling it — however the week wraps.
    <dl className="fhint:m-0 fhint:grid fhint:grid-cols-[repeat(auto-fill,minmax(min(100%,120px),1fr))] fhint:overflow-hidden fhint:border fhint:border-border fhint:xl:grid-cols-7">
      {days.map((day) => {
        const periods = day.periods ?? [];
        const closed = periods.some((period) => period.is_closed);
        const allDay = periods.some((period) => period.is_24h);
        const text = !day.configured
          ? __("Not set", "foundhint-local-seo")
          : closed
            ? __("Closed", "foundhint-local-seo")
            : allDay
              ? __("Open 24 hours", "foundhint-local-seo")
              : periods
                  .map(
                    (period) =>
                      `${String(period.open_time).slice(0, 5)}–${String(period.close_time).slice(0, 5)}`,
                  )
                  .join(", ");

        return (
          <div
            key={day.day_name}
            className="fhint:-mr-px fhint:-mb-px fhint:grid fhint:min-w-0 fhint:gap-0.5 fhint:border-r fhint:border-b fhint:border-border fhint:px-[11px] fhint:py-2"
          >
            <dt className="fhint:text-[12.5px] fhint:text-muted-strong">
              {day.day_name}
            </dt>
            <dd
              className={cn(
                "fhint:m-0 fhint:text-[13px] fhint:font-bold",
                !day.configured || closed
                  ? "fhint:text-muted-strong"
                  : "fhint:text-foreground",
              )}
            >
              {text}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

export default HoursGrid;
