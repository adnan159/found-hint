import { useRef, useState } from "react";
import { __, sprintf } from "@wordpress/i18n";
import { PlusIcon } from "lucide-react";
import { cn } from "cn";
import { newPeriod } from "../model";
import {
  errorText,
  focus,
  help,
  label,
  linkButton,
  quietButton,
  smallInput,
} from "../styles";

const choice = (on) =>
  cn(
    "fhint:cursor-pointer fhint:border fhint:px-[11px] fhint:py-1.5 fhint:text-[12.5px]",
    on
      ? "fhint:border-primary fhint:bg-notice fhint:font-extrabold fhint:text-notice-foreground"
      : "fhint:border-border fhint:bg-card fhint:font-semibold fhint:text-foreground-soft",
    focus,
  );

/**
 * The design's square switch. A real `role="switch"` button, so it is
 * announced as on or off and works from the keyboard; the word beside it
 * says the same thing the colour does.
 */
function OpenSwitch({ on, onToggle, name }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={name}
      onClick={onToggle}
      className={cn(
        "fhint:relative fhint:h-5 fhint:w-[38px] fhint:flex-none fhint:cursor-pointer fhint:border-0 fhint:p-0",
        on ? "fhint:bg-primary" : "fhint:bg-input",
        focus,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "fhint:absolute fhint:top-[3px] fhint:size-3.5 fhint:bg-card fhint:transition-[left]",
          on ? "fhint:left-[21px]" : "fhint:left-[3px]",
        )}
      />
    </button>
  );
}

/**
 * The times of one day: all day, or one or more periods.
 *
 * `errors` is keyed the way the server reports them — `period_0.close_time`
 * for one time, an empty key for the day as a whole.
 */
function DayTimes({ day, onChange, errors, name }) {
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

// The errors of one day, with the day's own prefix taken off.
function errorsUnder(errors, prefix) {
  const found = {};

  for (const [key, message] of Object.entries(errors ?? {})) {
    if (key === prefix) {
      found[""] = message;
    } else if (key.startsWith(`${prefix}.`)) {
      found[key.slice(prefix.length + 1)] = message;
    }
  }

  return found;
}

const firstOf = (errors) => Object.values(errors)[0];

const ROW =
  "fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3 fhint:border-b fhint:border-b-[#eae7e7] fhint:px-0.5 fhint:py-[11px] fhint:last:border-b-0";

const STATE =
  "fhint:w-[58px] fhint:text-[11.5px] fhint:font-extrabold fhint:tracking-[0.06em] fhint:uppercase";

/**
 * The week, and the days that break it.
 *
 * A day nobody has filled in is "not set", which is not the same as closed:
 * it is not saved and not sent to Google, so the listing keeps whatever it
 * shows for that day. It becomes a real answer the moment it is touched.
 */
export function HoursSection({ model, onChange, errors }) {
  const [copied, setCopied] = useState(null);
  const timer = useRef(null);

  const setDay = (index, next) =>
    onChange({
      ...model,
      week: model.week.map((day, at) =>
        at === index ? { ...next, configured: true } : day,
      ),
    });

  const copyToAll = (index) => {
    const from = model.week[index];

    onChange({
      ...model,
      week: model.week.map((day) => ({
        ...day,
        configured: true,
        open: from.open,
        all: from.all,
        periods: from.periods.map((period) => ({ ...period })),
      })),
    });

    setCopied(index);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(null), 1800);
  };

  const setSpecial = (index, next) =>
    onChange({
      ...model,
      special: model.special.map((day, at) => (at === index ? next : day)),
    });

  const addSpecial = () =>
    onChange({
      ...model,
      special: [
        ...model.special,
        { date: "", open: false, all: false, note: "", periods: [newPeriod()] },
      ],
    });

  return (
    <>
      <div>
        {model.week.map((day, index) => {
          const dayErrors = errorsUnder(errors, `opening_hours.day_${day.day}`);
          const message = firstOf(dayErrors);

          return (
            <div key={day.day} className={ROW}>
              <span className="fhint:w-24 fhint:flex-none fhint:text-[13.5px] fhint:font-bold">
                {day.name}
              </span>
              {day.configured && day.open ? (
                <DayTimes
                  day={day}
                  name={day.name}
                  errors={dayErrors}
                  onChange={(next) => setDay(index, next)}
                />
              ) : (
                <span className="fhint:flex fhint:min-w-0 fhint:flex-1 fhint:flex-wrap fhint:items-center fhint:gap-2 fhint:text-[13px] fhint:text-muted-foreground">
                  {day.configured
                    ? __("Closed all day", "foundhint-local-seo")
                    : __("Not set yet", "foundhint-local-seo")}
                  {!day.configured ? (
                    <button
                      type="button"
                      onClick={() => setDay(index, { ...day, open: false })}
                      className={linkButton}
                    >
                      {__("Mark as closed", "foundhint-local-seo")}
                    </button>
                  ) : null}
                </span>
              )}
              {day.configured ? (
                <button
                  type="button"
                  onClick={() => copyToAll(index)}
                  className={linkButton}
                >
                  <span aria-live="polite">
                    {copied === index
                      ? __("Copied to all", "foundhint-local-seo")
                      : __("Copy to all", "foundhint-local-seo")}
                  </span>
                </button>
              ) : null}
              <OpenSwitch
                on={day.configured && day.open}
                onToggle={() =>
                  setDay(index, { ...day, open: !(day.configured && day.open) })
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
        })}
      </div>

      <div className="fhint:grid fhint:gap-2.5 fhint:border-t fhint:border-t-border fhint:pt-[18px]">
        <div>
          <h3 className={cn(label, "fhint:m-0 fhint:text-sm")}>
            {__("Special hours", "foundhint-local-seo")}
          </h3>
          <p className={cn(help, "fhint:m-0")}>
            {__(
              "Holidays and one-off days, so customers do not turn up to a closed door.",
              "foundhint-local-seo",
            )}
          </p>
        </div>

        {model.special.map((day, index) => {
          const dayErrors = errorsUnder(errors, `special_hours.day_${index}`);
          const message = firstOf(dayErrors);
          const name = day.date || __("This day", "foundhint-local-seo");

          return (
            <div
              key={index}
              className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3 fhint:border fhint:border-border fhint:px-3 fhint:py-2.5"
            >
              <input
                type="date"
                value={day.date}
                onChange={(event) =>
                  setSpecial(index, { ...day, date: event.target.value })
                }
                aria-label={__("Date", "foundhint-local-seo")}
                aria-invalid={dayErrors.date ? true : undefined}
                className={smallInput}
              />
              {day.open ? (
                <DayTimes
                  day={day}
                  name={name}
                  errors={dayErrors}
                  onChange={(next) => setSpecial(index, next)}
                />
              ) : (
                <span className="fhint:min-w-0 fhint:flex-1 fhint:text-[13px] fhint:text-muted-foreground">
                  {__("Closed all day", "foundhint-local-seo")}
                </span>
              )}
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...model,
                    special: model.special.filter((_, at) => at !== index),
                  })
                }
                className={linkButton}
              >
                {__("Remove", "foundhint-local-seo")}
              </button>
              <OpenSwitch
                on={day.open}
                onToggle={() => setSpecial(index, { ...day, open: !day.open })}
                name={sprintf(
                  /* translators: %s: a date. */
                  __("%s is open", "foundhint-local-seo"),
                  name,
                )}
              />
              <span
                className={cn(
                  STATE,
                  day.open
                    ? "fhint:text-success"
                    : "fhint:text-muted-foreground",
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
        })}

        <button
          type="button"
          onClick={addSpecial}
          className={cn(
            quietButton,
            "fhint:justify-center fhint:border-dashed fhint:py-2.5",
          )}
        >
          <PlusIcon aria-hidden="true" className="fhint:size-3.5" />
          {__("Add special hours", "foundhint-local-seo")}
        </button>
      </div>
    </>
  );
}

export default HoursSection;
