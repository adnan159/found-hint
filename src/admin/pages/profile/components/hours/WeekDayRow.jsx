import { __, sprintf } from "@wordpress/i18n";
import { cn } from "cn";
import { errorText, linkButton } from "../../styles";
import DayTimes from "./DayTimes";
import { firstOf } from "./errors";
import OpenSwitch from "./OpenSwitch";
import { STATE } from "./styles";

const ROW =
  "fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3 fhint:border-b fhint:border-b-[#eae7e7] fhint:px-0.5 fhint:py-[11px] fhint:last:border-b-0";

/**
 * One weekday: its times, or that it is closed, or that nobody has said.
 *
 * `onChange` takes the day as it should now be; the section marks it as
 * answered. `errors` are that day's own, prefix already taken off.
 */
export function WeekDayRow({
  day,
  errors: dayErrors,
  copied,
  onChange,
  onCopy,
}) {
  const message = firstOf(dayErrors);

  return (
    <div className={ROW}>
      <span className="fhint:w-24 fhint:flex-none fhint:text-[13.5px] fhint:font-bold">
        {day.name}
      </span>
      {day.configured && day.open ? (
        <DayTimes
          day={day}
          name={day.name}
          errors={dayErrors}
          onChange={(next) => onChange(next)}
        />
      ) : (
        <span className="fhint:flex fhint:min-w-0 fhint:flex-1 fhint:flex-wrap fhint:items-center fhint:gap-2 fhint:text-[13px] fhint:text-muted-foreground">
          {day.configured
            ? __("Closed all day", "foundhint-local-seo")
            : __("Not set yet", "foundhint-local-seo")}
          {!day.configured ? (
            <button
              type="button"
              onClick={() => onChange({ ...day, open: false })}
              className={linkButton}
            >
              {__("Mark as closed", "foundhint-local-seo")}
            </button>
          ) : null}
        </span>
      )}
      {day.configured ? (
        <button type="button" onClick={() => onCopy()} className={linkButton}>
          <span aria-live="polite">
            {copied
              ? __("Copied to all", "foundhint-local-seo")
              : __("Copy to all", "foundhint-local-seo")}
          </span>
        </button>
      ) : null}
      <OpenSwitch
        on={day.configured && day.open}
        onToggle={() =>
          onChange({ ...day, open: !(day.configured && day.open) })
        }
        name={sprintf(
          /* translators: %s: a weekday. */
          __("%s is open", "foundhint-local-seo"),
          day.name,
        )}
      />
      <span
        className={cn(
          STATE,
          day.configured && day.open
            ? "fhint:text-success"
            : "fhint:text-muted-foreground",
        )}
      >
        {!day.configured
          ? __("Not set", "foundhint-local-seo")
          : day.open
            ? __("Open", "foundhint-local-seo")
            : __("Closed", "foundhint-local-seo")}
      </span>
      {message ? (
        <span role="alert" className={cn(errorText, "fhint:w-full")}>
          {message}
        </span>
      ) : null}
    </div>
  );
}

export default WeekDayRow;
