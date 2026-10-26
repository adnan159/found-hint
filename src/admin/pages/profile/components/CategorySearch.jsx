import { useEffect, useId, useRef, useState } from "react";
import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { useLazySearchGoogleCategoriesQuery } from "@/store/api/profileApi";

/**
 * A search box over Google's business categories.
 *
 * What is chosen is an id (`gcid:dentist`), not a name: the same category is
 * worded differently from country to country, and two different categories
 * can share a name — there are two called "Swimming pool". So each result
 * shows the industry it belongs to, and the id is what goes back to the form.
 *
 * It is a combobox in the ARIA sense: the input owns a listbox, the arrow
 * keys move through it without moving focus, Enter chooses and Escape closes.
 */
export function CategorySearch({
  value,
  onType,
  onChoose,
  exclude = [],
  placeholder,
  disabled,
  inputClassName,
  ariaLabel,
  labelledBy,
  describedBy,
  invalid,
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [search, { data }] = useLazySearchGoogleCategoriesQuery();
  const timer = useRef(null);

  const results = (data ?? []).filter((item) => !exclude.includes(item.id));

  // Wait for a pause in typing before asking: one request per word, not one
  // per letter.
  useEffect(() => {
    clearTimeout(timer.current);

    if (!open || !String(value ?? "").trim()) {
      return undefined;
    }

    timer.current = setTimeout(() => search(String(value).trim(), true), 180);

    return () => clearTimeout(timer.current);
  }, [value, open, search]);

  const choose = (item) => {
    onChoose({ id: item.id, name: item.name });
    setOpen(false);
    setActive(0);
  };

  const showing =
    open && Boolean(String(value ?? "").trim()) && results.length > 0;

  const onKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      if (showing && results[active]) {
        event.preventDefault();
        choose(results[active]);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="fhint:relative fhint:min-w-[180px] fhint:flex-1">
      <input
        role="combobox"
        aria-expanded={showing}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={showing ? `${id}-option-${active}` : undefined}
        aria-label={ariaLabel}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        aria-invalid={invalid ? true : undefined}
        autoComplete="off"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => {
          onType(event.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        // Late enough for a click on a result to land first.
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
        className={inputClassName}
      />
      {showing ? (
        <ul
          id={`${id}-list`}
          role="listbox"
          aria-label={__("Matching Google categories", "foundhint-local-seo")}
          className="fhint:absolute fhint:top-full fhint:right-0 fhint:left-0 fhint:z-20 fhint:m-0 fhint:mt-1 fhint:max-h-72 fhint:list-none fhint:overflow-auto fhint:border fhint:border-foreground fhint:bg-card fhint:p-0 fhint:shadow-[0_12px_32px_rgba(45,43,43,0.22)]"
        >
          {results.map((item, index) => (
            <li
              key={item.id}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={index === active}
              // mousedown, not click: it fires before the input's blur.
              onMouseDown={(event) => {
                event.preventDefault();
                choose(item);
              }}
              onMouseEnter={() => setActive(index)}
              className={cn(
                "fhint:m-0 fhint:flex fhint:cursor-pointer fhint:flex-wrap fhint:items-baseline fhint:gap-x-2.5 fhint:border-b fhint:border-b-border fhint:px-3 fhint:py-2 fhint:text-[13px] fhint:last:border-b-0",
                index === active && "fhint:bg-muted",
              )}
            >
              <span className="fhint:font-bold">{item.name}</span>
              <span className="fhint:text-[12px] fhint:text-muted-strong">
                {item.bucket}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default CategorySearch;
