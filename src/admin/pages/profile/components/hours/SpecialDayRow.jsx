import { __, sprintf } from "@wordpress/i18n";
import { cn } from "cn";
import { errorText, linkButton, smallInput } from "../../styles";
import DayTimes from "./DayTimes";
import { firstOf } from "./errors";
import OpenSwitch from "./OpenSwitch";
import { STATE } from "./styles";

/**
 * One special day: a date, and either its times or that it is closed.
 *
 * `errors` are that day's own, prefix already taken off.
 */
export function SpecialDayRow({ day, errors: dayErrors, onChange, onRemove }) {
  const message = firstOf(dayErrors);
  const name = day.date || __("This day", "foundhint-local-seo");

  return (
    <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3 fhint:border fhint:border-border fhint:px-3 fhint:py-2.5">
      <input
        type="date"
        value={day.date}
        onChange={(event) => onChange({ ...day, date: event.target.value })}
        aria-label={__("Date", "foundhint-local-seo")}
        aria-invalid={dayErrors.date ? true : undefined}
        className={smallInput}
      />
      {day.open ? (
        <DayTimes
          day={day}
          name={name}
          errors={dayErrors}
          onChange={(next) => onChange(next)}
        />
      ) : (
        <span className="fhint:min-w-0 fhint:flex-1 fhint:text-[13px] fhint:text-muted-foreground">
          {__("Closed all day", "foundhint-local-seo")}
        </span>
      )}
      <button type="button" onClick={onRemove} className={linkButton}>
        {__("Remove", "foundhint-local-seo")}
      </button>
      <OpenSwitch
        on={day.open}
        onToggle={() => onChange({ ...day, open: !day.open })}
        name={sprintf(
          /* translators: %s: a date. */
          __("%s is open", "foundhint-local-seo"),
          name,
        )}
      />
      <span
        className={cn(
          STATE,
          day.open ? "fhint:text-success" : "fhint:text-muted-foreground",
        )}
      >
        {day.open
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

export default SpecialDayRow;
