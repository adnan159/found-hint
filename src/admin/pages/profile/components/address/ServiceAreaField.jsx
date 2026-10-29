import { useId, useRef, useState } from "react";
import { __, sprintf } from "@wordpress/i18n";
import { MapPinIcon, XIcon } from "lucide-react";
import { cn } from "cn";
import { chipBox, chipBoxInput } from "@/lib/fieldStyles";
import { errorText, focus, help, label as labelClass } from "../../styles";

/**
 * The places this location serves, as removable chips.
 *
 * A place is `{ name, place_id }`. One read from Google has Google's place
 * id and can be sent back; one typed here has none — Google needs a place
 * picked on Google — so it is kept for the website's markup and not sent.
 * Those are drawn with a dashed outline *and* said in words, so the
 * difference is never carried by the outline alone.
 *
 * Enter or a comma adds what was typed; each chip has its own remove
 * button. Removing one moves focus back to the box, so a keyboard user is
 * never left on a button that has just gone.
 */
export function ServiceAreaField({ value, onChange, errors, max = 20 }) {
  const id = useId();
  const box = useRef(null);
  const [draft, setDraft] = useState("");
  const places = Array.isArray(value) ? value : [];
  const full = places.length >= max;
  const typedCount = places.filter((place) => !place.place_id).length;
  const listError = errors?.service_area;
  const chipErrors = places
    .map((place, index) => errors?.[`service_area.${index}`])
    .filter(Boolean);

  const add = () => {
    const name = draft.trim().replace(/\s+/g, " ");

    if (!name || full) {
      return;
    }

    // The same place twice says nothing new; matched as the server does.
    if (
      !places.some(
        (place) => place.name.trim().toLowerCase() === name.toLowerCase(),
      )
    ) {
      onChange([...places, { name, place_id: "" }]);
    }

    setDraft("");
  };

  const remove = (index) => {
    onChange(places.filter((_, at) => at !== index));
    window.requestAnimationFrame(() => box.current?.focus());
  };

  const described = [
    `${id}-help`,
    typedCount ? `${id}-typed` : "",
    listError || chipErrors.length ? `${id}-error` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="fhint:grid fhint:gap-1.5">
      <div className="fhint:flex fhint:items-center fhint:gap-2">
        <label htmlFor={id} className={labelClass}>
          {__("Service area", "foundhint-local-seo")}
        </label>
        <span
          aria-live="polite"
          className="fhint:ml-auto fhint:text-[12.5px] fhint:font-bold fhint:text-muted-strong"
        >
          {sprintf(
            /* translators: 1: places added, 2: the most allowed. */
            __("%1$d of %2$d used", "foundhint-local-seo"),
            places.length,
            max,
          )}
        </span>
      </div>

      <div className={cn(chipBox, "fhint:min-h-[46px] fhint:gap-2")}>
        <ul
          aria-label={__("Places served", "foundhint-local-seo")}
          className="fhint:m-0 fhint:flex fhint:list-none fhint:flex-wrap fhint:gap-2 fhint:p-0"
        >
          {places.map((place, index) => (
            <li
              key={`${place.place_id || "typed"}-${place.name}`}
              className={cn(
                "fhint:inline-flex fhint:items-center fhint:gap-1.5 fhint:rounded-full fhint:border fhint:bg-muted fhint:py-1 fhint:pr-1 fhint:pl-2.5 fhint:text-[13px] fhint:font-bold",
                place.place_id
                  ? "fhint:border-border"
                  : "fhint:border-dashed fhint:border-muted-strong",
                errors?.[`service_area.${index}`] && "fhint:border-destructive",
              )}
            >
              <MapPinIcon
                aria-hidden="true"
                className="fhint:size-3.5 fhint:flex-none fhint:text-muted-strong"
              />
              <span>{place.name}</span>
              {place.place_id ? null : (
                <span className="fhint:sr-only">
                  {__("(website only)", "foundhint-local-seo")}
                </span>
              )}
              <button
                type="button"
                onClick={() => remove(index)}
                aria-label={sprintf(
                  /* translators: %s: a place, e.g. "Austin, TX". */
                  __("Remove %s", "foundhint-local-seo"),
                  place.name,
                )}
                className={cn(
                  "fhint:grid fhint:size-6 fhint:cursor-pointer fhint:place-items-center fhint:rounded-full fhint:border-0 fhint:bg-transparent fhint:text-muted-strong fhint:hover:bg-card fhint:hover:text-foreground",
                  focus,
                )}
              >
                <XIcon aria-hidden="true" className="fhint:size-3" />
              </button>
            </li>
          ))}
        </ul>
        <input
          ref={box}
          id={id}
          type="text"
          value={draft}
          disabled={full}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              // Enter would otherwise submit the section's form.
              event.preventDefault();
              add();
            }
          }}
          onBlur={add}
          aria-describedby={described}
          aria-invalid={listError ? true : undefined}
          placeholder={
            full
              ? __("Remove a place to add another", "foundhint-local-seo")
              : __(
                  "Type a city, region or postcode and press Enter",
                  "foundhint-local-seo",
                )
          }
          className={cn(chipBoxInput, "fhint:min-w-[220px]")}
        />
      </div>

      <span id={`${id}-help`} className={help}>
        {__(
          "The areas you serve beyond your address. Each one is listed on your website as an area served.",
          "foundhint-local-seo",
        )}
      </span>
      {typedCount ? (
        <span id={`${id}-typed`} className={help}>
          {__(
            "Places with a dashed outline were typed here. Google only accepts places chosen on Google, so they are on your website but are not sent to your Google listing.",
            "foundhint-local-seo",
          )}
        </span>
      ) : null}
      {listError || chipErrors.length ? (
        <span id={`${id}-error`} role="alert" className={errorText}>
          {[listError, ...chipErrors].filter(Boolean).join(" ")}
        </span>
      ) : null}
    </div>
  );
}

export default ServiceAreaField;
