import { __, sprintf } from "@wordpress/i18n";
import { PlusIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Weekly opening hours.
 *
 * Each day is in one of four states, and the first two are genuinely
 * different things:
 *
 * - **not set** — never filled in. Publishes nothing.
 * - **closed** — deliberately shut that day. Published as closed.
 * - **24 hours**
 * - **open** — one or more periods; two periods is a lunch break.
 *
 * Treating "not set" as "closed" would publish "closed Sunday" for a
 * business that simply hasn't got to Sunday yet, so the two are kept
 * distinct all the way through to the payload: a day left unset is omitted
 * from the request entirely.
 */

export const DAY_MODES = {
  UNSET: "unset",
  OPEN: "open",
  CLOSED: "closed",
  TWENTY_FOUR: "24h",
};

/**
 * Turn the API's opening_hours payload into editor state.
 *
 * @param {object} payload The location's opening_hours object.
 * @return {Array} One entry per day, in the order the server returned.
 */
export function hoursToState(payload) {
  const days = payload?.days ?? [];

  return days.map((day) => {
    let mode = DAY_MODES.UNSET;

    if (day.configured) {
      const first = day.periods[0];

      if (first?.is_24h) {
        mode = DAY_MODES.TWENTY_FOUR;
      } else if (first?.is_closed) {
        mode = DAY_MODES.CLOSED;
      } else {
        mode = DAY_MODES.OPEN;
      }
    }

    return {
      dayOfWeek: day.day_of_week,
      dayName: day.day_name,
      mode,
      periods:
        mode === DAY_MODES.OPEN
          ? day.periods.map((period) => ({
              open_time: period.open_time,
              close_time: period.close_time,
            }))
          : [{ open_time: "09:00", close_time: "17:00" }],
    };
  });
}

/**
 * A blank week, for a location that has no hours yet.
 *
 * Day names come from Intl rather than a hardcoded English list, and day
 * numbering matches the API's (0 = Sunday), while the display order starts
 * on Monday — the two are separate concerns and conflating them would shift
 * every day by one.
 *
 * @return {Array} Editor state for an unconfigured week.
 */
export function emptyHoursState() {
  const formatter = new Intl.DateTimeFormat(undefined, { weekday: "long" });
  // 2024-01-07 was a Sunday, so adding the day number lands on that weekday.
  const nameFor = (dayOfWeek) =>
    formatter.format(new Date(Date.UTC(2024, 0, 7 + dayOfWeek)));

  return [1, 2, 3, 4, 5, 6, 0].map((dayOfWeek) => ({
    dayOfWeek,
    dayName: nameFor(dayOfWeek),
    mode: DAY_MODES.UNSET,
    periods: [{ open_time: "09:00", close_time: "17:00" }],
  }));
}

/**
 * Turn editor state into the write payload.
 *
 * Days left unset are omitted rather than sent, because omitting is what
 * the API reads as "not configured".
 *
 * @param {Array} state Editor state.
 * @return {object} An opening_hours payload.
 */
export function stateToPayload(state) {
  const payload = {};

  state.forEach((day) => {
    if (day.mode === DAY_MODES.UNSET) {
      return;
    }

    if (day.mode === DAY_MODES.CLOSED) {
      payload[day.dayOfWeek] = { is_closed: true };
      return;
    }

    if (day.mode === DAY_MODES.TWENTY_FOUR) {
      payload[day.dayOfWeek] = { is_24h: true };
      return;
    }

    payload[day.dayOfWeek] = {
      periods: day.periods.map((period) => ({
        open_time: period.open_time,
        close_time: period.close_time,
      })),
    };
  });

  return payload;
}

// Built per render rather than at module load so the labels follow the
// active locale rather than whichever one was loaded first.
const modeItems = () => [
  { value: DAY_MODES.UNSET, label: __("Not set", "found-hint") },
  { value: DAY_MODES.OPEN, label: __("Open", "found-hint") },
  { value: DAY_MODES.CLOSED, label: __("Closed", "found-hint") },
  { value: DAY_MODES.TWENTY_FOUR, label: __("Open 24 hours", "found-hint") },
];

export function OpeningHoursEditor({ value, onChange, errors = {} }) {
  const update = (index, patch) => {
    onChange(
      value.map((day, position) =>
        position === index ? { ...day, ...patch } : day,
      ),
    );
  };

  const updatePeriod = (dayIndex, periodIndex, patch) => {
    const day = value[dayIndex];

    update(dayIndex, {
      periods: day.periods.map((period, position) =>
        position === periodIndex ? { ...period, ...patch } : period,
      ),
    });
  };

  return (
    <div className="fhint:flex fhint:flex-col fhint:gap-3">
      {value.map((day, dayIndex) => {
        const dayError = errors[`opening_hours.day_${day.dayOfWeek}`];

        return (
          <div
            key={day.dayOfWeek}
            className="fhint:flex fhint:flex-col fhint:gap-2 fhint:border-b fhint:border-b-border fhint:pb-3 fhint:last:border-b-0 fhint:last:pb-0"
          >
            <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3">
              <span className="fhint:w-28 fhint:shrink-0 fhint:text-[13px] fhint:font-bold">
                {day.dayName}
              </span>

              <Select
                items={modeItems()}
                value={day.mode}
                onValueChange={(mode) => update(dayIndex, { mode })}
              >
                <SelectTrigger
                  className="fhint:w-40"
                  aria-label={sprintf(
                    /* translators: %s: day name. */
                    __("Opening hours for %s", "found-hint"),
                    day.dayName,
                  )}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={DAY_MODES.UNSET}>
                      {__("Not set", "found-hint")}
                    </SelectItem>
                    <SelectItem value={DAY_MODES.OPEN}>
                      {__("Open", "found-hint")}
                    </SelectItem>
                    <SelectItem value={DAY_MODES.CLOSED}>
                      {__("Closed", "found-hint")}
                    </SelectItem>
                    <SelectItem value={DAY_MODES.TWENTY_FOUR}>
                      {__("Open 24 hours", "found-hint")}
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>

              {day.mode === DAY_MODES.OPEN ? (
                <div className="fhint:flex fhint:flex-col fhint:gap-2">
                  {day.periods.map((period, periodIndex) => {
                    const openError =
                      errors[
                        `opening_hours.day_${day.dayOfWeek}.period_${periodIndex}.open_time`
                      ];
                    const closeError =
                      errors[
                        `opening_hours.day_${day.dayOfWeek}.period_${periodIndex}.close_time`
                      ];

                    return (
                      <div
                        key={periodIndex}
                        className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2"
                      >
                        <Input
                          type="time"
                          className="fhint:w-32"
                          value={period.open_time}
                          aria-invalid={openError ? true : undefined}
                          aria-label={sprintf(
                            /* translators: %s: day name. */
                            __("Opens on %s", "found-hint"),
                            day.dayName,
                          )}
                          onChange={(event) =>
                            updatePeriod(dayIndex, periodIndex, {
                              open_time: event.target.value,
                            })
                          }
                        />
                        <span className="fhint:text-muted-foreground">
                          {__("to", "found-hint")}
                        </span>
                        <Input
                          type="time"
                          className="fhint:w-32"
                          value={period.close_time}
                          aria-invalid={closeError ? true : undefined}
                          aria-label={sprintf(
                            /* translators: %s: day name. */
                            __("Closes on %s", "found-hint"),
                            day.dayName,
                          )}
                          onChange={(event) =>
                            updatePeriod(dayIndex, periodIndex, {
                              close_time: event.target.value,
                            })
                          }
                        />
                        {day.periods.length > 1 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={__("Remove this period", "found-hint")}
                            onClick={() =>
                              update(dayIndex, {
                                periods: day.periods.filter(
                                  (item, position) => position !== periodIndex,
                                ),
                              })
                            }
                          >
                            <XIcon />
                          </Button>
                        ) : null}
                        {openError || closeError ? (
                          <span
                            role="alert"
                            className="fhint:text-xs fhint:text-destructive"
                          >
                            {openError || closeError}
                          </span>
                        ) : null}
                      </div>
                    );
                  })}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="fhint:self-start"
                    onClick={() =>
                      update(dayIndex, {
                        periods: [
                          ...day.periods,
                          { open_time: "13:00", close_time: "18:00" },
                        ],
                      })
                    }
                  >
                    <PlusIcon data-icon="inline-start" />
                    {__("Split shift", "found-hint")}
                  </Button>
                </div>
              ) : null}
            </div>

            {dayError ? (
              <span
                role="alert"
                className="fhint:pl-31 fhint:text-xs fhint:text-destructive"
              >
                {dayError}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export default OpeningHoursEditor;
