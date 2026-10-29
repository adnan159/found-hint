import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { PRICE_RANGES } from "../../lib/field";
import HoursGrid from "./HoursGrid";
import { input } from "../styles";
import ImagePicker from "./ImagePicker";

const TEXT_TYPES = { url: "url", tel: "tel" };

/**
 * The control for one field, by its `input` kind: the week's hours, a
 * textarea (or one link per line), a price range, photos, or a text box.
 */
export function FieldControl({
  id,
  field,
  value,
  status,
  describedBy,
  photos,
  onChange,
}) {
  const { readOnly, tone } = status;
  const invalid = tone === "missing" ? true : undefined;

  switch (field.input) {
    case "hours":
      return <HoursGrid hours={value} />;

    case "textarea":
    case "lines":
      return (
        <textarea
          id={id}
          rows={3}
          value={value ?? ""}
          readOnly={readOnly}
          // Nothing to type: keep the keyboard on fields that take input.
          tabIndex={readOnly ? -1 : undefined}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          placeholder={
            field.input === "lines"
              ? __(
                  "One link per line, starting with https://",
                  "foundhint-local-seo",
                )
              : undefined
          }
          className={cn(input(tone), "fhint:resize-y")}
        />
      );

    case "price":
      return (
        <select
          id={id}
          value={value ?? ""}
          disabled={readOnly}
          onChange={(event) => onChange(event.target.value)}
          aria-describedby={describedBy}
          // WordPress caps every admin select at 25rem.
          className={cn(input(tone), "fhint:max-w-none! fhint:pr-8!")}
        >
          <option value="">{__("Not set", "foundhint-local-seo")}</option>
          {PRICE_RANGES.map((range) => (
            <option key={range} value={range}>
              {range}
            </option>
          ))}
          {/* A saved value outside the usual ranges stays choosable. */}
          {value && !PRICE_RANGES.includes(value) ? (
            <option value={value}>{value}</option>
          ) : null}
        </select>
      );

    case "images":
      return (
        <ImagePicker
          id={id}
          value={Array.isArray(value) ? value : []}
          photos={photos}
          readOnly={readOnly}
          onChange={onChange}
          describedBy={describedBy}
        />
      );

    default:
      return (
        <input
          id={id}
          type={TEXT_TYPES[field.input] ?? "text"}
          inputMode={field.input === "number" ? "decimal" : undefined}
          value={value ?? ""}
          readOnly={readOnly}
          tabIndex={readOnly ? -1 : undefined}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          className={input(tone)}
        />
      );
  }
}

export default FieldControl;
