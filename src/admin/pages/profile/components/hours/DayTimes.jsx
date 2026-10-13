import { __, sprintf } from "@wordpress/i18n";
import { cn } from "cn";
import { focus, linkButton, smallInput } from "../../styles";

const choice = (on) =>
  cn(
    "fhint:cursor-pointer fhint:border fhint:px-[11px] fhint:py-1.5 fhint:text-[12.5px]",
    on
      ? "fhint:border-primary fhint:bg-notice fhint:font-extrabold fhint:text-notice-foreground"
      : "fhint:border-border fhint:bg-card fhint:font-semibold fhint:text-foreground-soft",
    focus,
  );
/**
 * The times of one day: all day, or one or more periods.
 *
 * `errors` is keyed the way the server reports them — `period_0.close_time`
 * for one time, an empty key for the day as a whole.
 */
export function DayTimes({ day, onChange, errors, name }) {
  const setPeriod = (index, key, value) =>
    onChange({
      ...day,
      periods: day.periods.map((period, at) =>
        at === index ? { ...period, [key]: value } : period,
      ),
    });

  return (
    <div className="fhint:flex fhint:min-w-0 fhint:flex-1 fhint:flex-wrap fhint:items-center fhint:gap-2">
      <button
        type="button"
        aria-pressed={day.all}
        onClick={() => onChange({ ...day, all: true })}
        className={choice(day.all)}
      >
        {__("Open 24 hours", "foundhint-local-seo")}
      </button>
      <button
        type="button"
        aria-pressed={!day.all}
        onClick={() => onChange({ ...day, all: false })}
        className={choice(!day.all)}
      >
        {__("Set custom hours", "foundhint-local-seo")}
      </button>
      {!day.all ? (
        <span className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-x-3 fhint:gap-y-1.5">
          {day.periods.map((period, index) => {
            const bad =
              errors?.[`period_${index}.open_time`] ??
              errors?.[`period_${index}.close_time`];

            return (
              <span
                key={index}
                className="fhint:inline-flex fhint:items-center fhint:gap-1.5"
              >
                <input
                  type="time"
                  value={period.from}
                  onChange={(event) =>
                    setPeriod(index, "from", event.target.value)
                  }
                  aria-invalid={bad ? true : undefined}
                  aria-label={sprintf(
                    /* translators: %s: a day, such as Monday or a date. */
                    __("%s opens at", "foundhint-local-seo"),
                    name,
                  )}
                  className={smallInput}
                />
                <span className="fhint:text-[12.5px] fhint:text-muted-strong">
                  {__("to", "foundhint-local-seo")}
                </span>
                <input
                  type="time"
                  value={period.to}
                  onChange={(event) =>
                    setPeriod(index, "to", event.target.value)
                  }
                  aria-invalid={bad ? true : undefined}
                  aria-label={sprintf(
                    /* translators: %s: a day, such as Monday or a date. */
                    __("%s closes at", "foundhint-local-seo"),
                    name,
                  )}
                  className={smallInput}
                />
                {day.periods.length > 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        ...day,
                        periods: day.periods.filter((_, at) => at !== index),
                      })
                    }
                    aria-label={sprintf(
                      /* translators: %s: a day, such as Monday or a date. */
                      __("Remove these hours from %s", "foundhint-local-seo"),
                      name,
                    )}
                    className={cn(
                      "fhint:cursor-pointer fhint:border-0 fhint:bg-transparent fhint:px-1 fhint:text-[15px] fhint:leading-none fhint:text-muted-strong",
                      focus,
                    )}
                  >
                    ×
                  </button>
                ) : null}
              </span>
            );
          })}
          <button
            type="button"
            onClick={() =>
              onChange({
                ...day,
                periods: [...day.periods, { from: "14:00", to: "18:00" }],
              })
            }
            className={linkButton}
          >
            {__("+ Add a break", "foundhint-local-seo")}
          </button>
        </span>
      ) : null}
    </div>
  );
}

export default DayTimes;
