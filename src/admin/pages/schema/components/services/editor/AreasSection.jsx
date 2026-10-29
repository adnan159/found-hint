import { useState } from "react";
import { __, sprintf } from "@wordpress/i18n";
import { XIcon } from "lucide-react";
import { cn } from "cn";
import { focus } from "@/pages/profile/styles";
import { AREA_TYPES, areaTypeLabel, withArea } from "../../../lib/service";
import { chip, input, muted } from "../../styles";
import { EditorSection } from "./EditorSection";
import { FieldError } from "./FieldError";

/**
 * 03 Service areas: the places served, added by hand or from the Google
 * listing's own service area.
 *
 * @param {Object}   props
 * @param {Object}   props.form        From the editor.
 * @param {string[]} props.suggestions Place names from Google.
 */
export function AreasSection({ form, suggestions = [] }) {
  const { values, set, locked, errors } = form;
  const [name, setName] = useState("");
  const [type, setType] = useState("City");
  const areas = values.areas ?? [];

  const add = (place, kind, source) => {
    const next = withArea(areas, place, kind, source);

    if (next) {
      set({ areas: next });
    }
  };

  const addTyped = () => {
    add(name, type);
    setName("");
  };

  // Google's places not already on the list, under any type.
  const offered = suggestions.filter(
    (place) =>
      !areas.some((area) => area.name.toLowerCase() === place.toLowerCase()),
  );

  return (
    <EditorSection
      number="03"
      title={__("Service areas", "foundhint-local-seo")}
      hint={__(
        "Only add places you genuinely serve. A service area is not your business address, which lives in Location schema.",
        "foundhint-local-seo",
      )}
    >
      <ul
        className="fhint:m-0 fhint:flex fhint:list-none fhint:flex-wrap fhint:gap-1.5 fhint:p-0"
        aria-label={__("Areas served", "foundhint-local-seo")}
      >
        {areas.map((area) => (
          <li
            key={`${area.type}-${area.name}`}
            className="fhint:inline-flex fhint:items-center fhint:gap-1.5 fhint:border fhint:border-input fhint:bg-card fhint:py-1 fhint:pr-1 fhint:pl-2.5 fhint:text-[12.5px]"
          >
            <strong>{area.name}</strong>
            <span className="fhint:text-[11.5px] fhint:text-muted-strong">
              {areaTypeLabel(area.type)}
            </span>
            {locked ? null : (
              <button
                type="button"
                onClick={() =>
                  set({ areas: areas.filter((item) => item !== area) })
                }
                aria-label={sprintf(
                  /* translators: %s: a place name. */
                  __("Remove %s", "foundhint-local-seo"),
                  area.name,
                )}
                className={cn(
                  "fhint:inline-flex fhint:cursor-pointer fhint:border-0 fhint:bg-transparent fhint:p-0.5 fhint:text-muted-strong",
                  focus,
                )}
              >
                <XIcon aria-hidden="true" className="fhint:size-3.5" />
              </button>
            )}
          </li>
        ))}
        {!areas.length ? (
          <li className={muted}>
            {__("No areas yet.", "foundhint-local-seo")}
          </li>
        ) : null}
      </ul>

      {locked ? null : (
        <div className="fhint:flex fhint:flex-wrap fhint:gap-2">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addTyped();
              }
            }}
            placeholder={__(
              "City, region or named area",
              "foundhint-local-seo",
            )}
            aria-label={__("Area name", "foundhint-local-seo")}
            className={cn(input("open"), "fhint:max-w-[260px] fhint:flex-1")}
          />
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            aria-label={__("Area type", "foundhint-local-seo")}
            className={cn(input("open"), "fhint:w-auto fhint:pr-8!")}
          >
            {AREA_TYPES.map(([key, text]) => (
              <option key={key} value={key}>
                {text()}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!name.trim()}
            onClick={addTyped}
            className={chip(false)}
          >
            {__("Add", "foundhint-local-seo")}
          </button>
        </div>
      )}

      {!locked && offered.length ? (
        <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-1.5">
          <span className={muted}>
            {__("From your Google service area:", "foundhint-local-seo")}
          </span>
          {offered.map((place) => (
            <button
              key={place}
              type="button"
              onClick={() => add(place, "Place", "google")}
              className={chip(false)}
            >
              {`+ ${place}`}
            </button>
          ))}
        </div>
      ) : null}
      <FieldError messages={errors.areas} />
    </EditorSection>
  );
}

export default AreasSection;
