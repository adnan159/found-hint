import { useEffect, useMemo, useState } from "react";
import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { countryOptions, joinNumber, splitNumber } from "@/lib/callingCodes";

/**
 * A phone number as a country code and the number.
 *
 * The value is one string. A number edited here comes out international —
 * `+8801712345678` — which Google takes from any country without guessing.
 * A number stored before this field existed, such as Google's national
 * "01518-984873", is shown under the location's country and left exactly
 * as it is until someone edits it, so opening the form changes nothing.
 *
 * The country is held in state of its own, so one chosen before a number
 * is typed is not lost.
 *
 * @param {Object}   props
 * @param {string}   props.id              The number box's id, for a label.
 * @param {string}   props.value           The stored number.
 * @param {Function} props.onChange        Receives the joined number.
 * @param {string}   props.fallbackCountry ISO code to start on.
 * @param {string}   props.inputClass      Class for the select and the box.
 * @param {boolean}  [props.invalid]       Marks the box invalid.
 * @param {string}   [props.describedBy]   Ids describing the box.
 * @param {string}   [props.label]         The box's own label, when no
 *                                         visible label points at `id`.
 * @param {string}   [props.placeholder]   Placeholder for the box.
 * @param {Object}   [props.inputRef]      Ref to the number box.
 */
export function PhoneNumberInput({
  id,
  value,
  onChange,
  fallbackCountry,
  inputClass,
  invalid,
  describedBy,
  label,
  placeholder,
  inputRef,
}) {
  const locale =
    (typeof document !== "undefined" && document.documentElement.lang) || "en";
  const options = useMemo(() => countryOptions(locale), [locale]);
  const initial = splitNumber(value, fallbackCountry);
  const [country, setCountry] = useState(initial.country);
  const [number, setNumber] = useState(initial.number);

  // A switch of location, a save or a discard brings a new value in from
  // outside; the boxes follow it unless they already say the same thing.
  useEffect(() => {
    const next = splitNumber(value, fallbackCountry);

    if (joinNumber(country, number) !== joinNumber(next.country, next.number)) {
      setCountry(next.country);
      setNumber(next.number);
    }
  }, [value, fallbackCountry]);

  const update = (nextCountry, nextNumber) => {
    setCountry(nextCountry);
    setNumber(nextNumber);
    onChange(joinNumber(nextCountry, nextNumber));
  };

  return (
    <div className="fhint:flex fhint:min-w-0 fhint:flex-1 fhint:gap-2">
      <select
        value={country}
        onChange={(event) => update(event.target.value, number)}
        aria-label={__("Country code", "foundhint-local-seo")}
        className={cn(inputClass, "fhint:w-[42%]! fhint:flex-none")}
      >
        {options.map((option) => (
          <option key={option.code} value={option.code}>
            {`${option.name} (+${option.dial})`}
          </option>
        ))}
      </select>
      <input
        ref={inputRef}
        id={id}
        type="tel"
        inputMode="tel"
        value={number}
        onChange={(event) => update(country, event.target.value)}
        aria-label={label}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy || undefined}
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  );
}

export default PhoneNumberInput;
