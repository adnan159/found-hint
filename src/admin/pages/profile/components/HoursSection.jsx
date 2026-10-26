import { useRef, useState } from "react";
import { __ } from "@wordpress/i18n";
import { PlusIcon } from "lucide-react";
import { cn } from "cn";
import { newPeriod } from "../model";
import { help, label, quietButton } from "../styles";
import { errorsUnder } from "./hours/errors";
import SpecialDayRow from "./hours/SpecialDayRow";
import WeekDayRow from "./hours/WeekDayRow";

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
        {model.week.map((day, index) => (
          <WeekDayRow
            key={day.day}
            day={day}
            errors={errorsUnder(errors, `opening_hours.day_${day.day}`)}
            copied={copied === index}
            onChange={(next) => setDay(index, next)}
            onCopy={() => copyToAll(index)}
          />
        ))}
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

        {model.special.map((day, index) => (
          <SpecialDayRow
            key={index}
            day={day}
            errors={errorsUnder(errors, `special_hours.day_${index}`)}
            onChange={(next) => setSpecial(index, next)}
            onRemove={() =>
              onChange({
                ...model,
                special: model.special.filter((_, at) => at !== index),
              })
            }
          />
        ))}

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
