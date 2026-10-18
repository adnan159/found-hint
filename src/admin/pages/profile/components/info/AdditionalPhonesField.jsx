import { useId, useRef } from "react";
import { __, sprintf } from "@wordpress/i18n";
import { PlusIcon, XIcon } from "lucide-react";
import { cn } from "cn";
import PhoneNumberInput from "@/components/PhoneNumberInput";
import { errorText, focus, input, label as labelClass } from "../../styles";

// Google keeps two numbers besides the main one.
const MAX = 2;

/**
 * Up to two more phone numbers, each a country code and a number.
 *
 * Errors come from the server keyed `additional_phones` for the list and
 * `additional_phones.N` for one box, and each lands under its own box.
 * Removing a number moves focus to something that still exists — the add
 * button — so a keyboard user is never left on a control that just vanished.
 */
export function AdditionalPhonesField({ value, onChange, errors, country }) {
  const id = useId();
  const addRef = useRef(null);
  const boxes = useRef([]);
  const numbers = Array.isArray(value) ? value : [];
  const listError = errors?.additional_phones;

  const update = (index, text) =>
    onChange(numbers.map((number, at) => (at === index ? text : number)));

  const remove = (index) => {
    onChange(numbers.filter((_, at) => at !== index));
    window.requestAnimationFrame(() => addRef.current?.focus());
  };

  const add = () => {
    onChange([...numbers, ""]);
    window.requestAnimationFrame(() => boxes.current[numbers.length]?.focus());
  };

  return (
    <div
      role="group"
      aria-labelledby={`${id}-label`}
      className="fhint:grid fhint:gap-1.5"
    >
      <div className="fhint:flex fhint:items-center fhint:gap-2">
        <span id={`${id}-label`} className={labelClass}>
          {__("Additional phone numbers", "foundhint-local-seo")}
        </span>
        <span
          aria-live="polite"
          className="fhint:ml-auto fhint:text-[12.5px] fhint:font-bold fhint:text-muted-strong"
        >
          {sprintf(
            /* translators: 1: numbers added, 2: the most allowed. */
            __("%1$d of %2$d used", "foundhint-local-seo"),
            numbers.length,
            MAX,
          )}
        </span>
      </div>

      {numbers.map((number, index) => {
        const error = errors?.[`additional_phones.${index}`];

        return (
          <div key={index} className="fhint:grid fhint:gap-1">
            <div className="fhint:flex fhint:gap-2">
              <PhoneNumberInput
                inputRef={(node) => {
                  boxes.current[index] = node;
                }}
                value={number}
                onChange={(text) => update(index, text)}
                fallbackCountry={country}
                inputClass={input}
                label={sprintf(
                  /* translators: %d: 1 or 2. */
                  __("Additional phone number %d", "foundhint-local-seo"),
                  index + 1,
                )}
                invalid={Boolean(error)}
                describedBy={error ? `${id}-error-${index}` : undefined}
              />
              <button
                type="button"
                onClick={() => remove(index)}
                aria-label={sprintf(
                  /* translators: %d: 1 or 2. */
                  __(
                    "Remove additional phone number %d",
                    "foundhint-local-seo",
                  ),
                  index + 1,
                )}
                className={cn(
                  "fhint:grid fhint:w-[42px] fhint:flex-none fhint:cursor-pointer fhint:place-items-center fhint:border fhint:border-input fhint:bg-card fhint:text-muted-strong fhint:hover:text-foreground",
                  focus,
                )}
              >
                <XIcon aria-hidden="true" className="fhint:size-3.5" />
              </button>
            </div>
            {error ? (
              <span
                id={`${id}-error-${index}`}
                role="alert"
                className={errorText}
              >
                {error}
              </span>
            ) : null}
          </div>
        );
      })}

      {listError ? (
        <span role="alert" className={errorText}>
          {listError}
        </span>
      ) : null}

      {numbers.length < MAX ? (
        <button
          ref={addRef}
          type="button"
          onClick={add}
          className={cn(
            "fhint:inline-flex fhint:w-fit fhint:cursor-pointer fhint:items-center fhint:gap-1.5 fhint:border-0 fhint:bg-notice fhint:px-3 fhint:py-2 fhint:text-[12.5px] fhint:font-extrabold fhint:text-notice-foreground",
            focus,
          )}
        >
          <PlusIcon aria-hidden="true" className="fhint:size-3.5" />
          {__("Add a phone number", "foundhint-local-seo")}
        </button>
      ) : null}
    </div>
  );
}

export default AdditionalPhonesField;
