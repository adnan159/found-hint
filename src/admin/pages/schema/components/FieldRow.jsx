import { useId } from "react";
import { __, sprintf } from "@wordpress/i18n";
import { cn } from "cn";
import { BADGES, caption, input, label, linkAction, pill } from "./styles";
import { badgeLabel, fieldLabel } from "../lib/schema";
import HoursGrid from "./HoursGrid";

/**
 * One field: label, badges (requirement, From Google / Edited here), the
 * Edit ↔ Use Google's value action, the input, and the caption naming its
 * Business Profile source and the Schema.org property it becomes — so an
 * error in Google's test maps to exactly one field (doc §11.1, 13.16).
 *
 * A value from Google is read-only until Edit; an edited one shows
 * "Edited here" and can go back to Google's.
 */
export function FieldRow({
  field,
  value,
  editing,
  locked,
  missing,
  visitMode,
  error,
  photos,
  onEdit,
  onReset,
  onChange,
}) {
  const id = useId();
  const fromGoogle =
    field.source === "google" || field.source === "google_readonly";
  const edited = field.source === "override" || editing;
  const readOnly =
    locked || (fromGoogle && !editing) || field.source === "google_readonly";
  const describedBy = `${id}-caption${error ? ` ${id}-error` : ""}`;
  const state = missing || error ? "missing" : readOnly ? "locked" : "open";
  const wide = ["description", "hours", "social", "images"].includes(field.key);

  return (
    <div
      className={cn(
        "fhint:grid fhint:min-w-0 fhint:content-start fhint:gap-1.5",
        wide && "fhint:col-span-full",
      )}
    >
      <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2">
        <label
          htmlFor={field.input === "hours" ? undefined : id}
          className={label}
        >
          {fieldLabel(field.key)}
        </label>
        {badgeLabel(field.badge, visitMode) ? (
          <span
            className={cn(
              pill,
              BADGES[
                field.badge === "storefront" && visitMode === "service_area"
                  ? "optional"
                  : field.badge
              ],
            )}
          >
            {badgeLabel(field.badge, visitMode)}
          </span>
        ) : null}
        {fromGoogle && !edited ? (
          <span className={cn(pill, BADGES.google)}>
            {__("From Google", "foundhint-local-seo")}
          </span>
        ) : null}
        {edited && field.gbp ? (
          <span className={cn(pill, BADGES.edited)}>
            {__("Edited here", "foundhint-local-seo")}
          </span>
        ) : null}
        {!locked &&
        field.gbp &&
        field.source !== "google_readonly" &&
        field.google_value !== null ? (
          edited ? (
            <button
              type="button"
              onClick={onReset}
              className={cn(linkAction, "fhint:ml-auto")}
            >
              {__("Use Google's value", "foundhint-local-seo")}
            </button>
          ) : (
            <button
              type="button"
              onClick={onEdit}
              className={cn(linkAction, "fhint:ml-auto")}
            >
              {__("Edit", "foundhint-local-seo")}
              <span className="fhint:sr-only">{` ${fieldLabel(field.key)}`}</span>
            </button>
          )
        ) : null}
      </div>

      {field.input === "hours" ? (
        <HoursGrid hours={value} />
      ) : field.input === "textarea" || field.input === "lines" ? (
        <textarea
          id={id}
          rows={3}
          value={value ?? ""}
          readOnly={readOnly}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={state === "missing" ? true : undefined}
          aria-describedby={describedBy}
          placeholder={
            field.input === "lines"
              ? __(
                  "One link per line, starting with https://",
                  "foundhint-local-seo",
                )
              : undefined
          }
          className={cn(input(state), "fhint:resize-y")}
        />
      ) : field.input === "price" ? (
        <select
          id={id}
          value={value ?? ""}
          disabled={readOnly}
          onChange={(event) => onChange(event.target.value)}
          aria-describedby={describedBy}
          className={cn(input(state), "fhint:pr-8!")}
        >
          <option value="">{__("Not set", "foundhint-local-seo")}</option>
          {["$", "$$", "$$$", "$$$$"].map((range) => (
            <option key={range} value={range}>
              {range}
            </option>
          ))}
          {value && !["$", "$$", "$$$", "$$$$"].includes(value) ? (
            <option value={value}>{value}</option>
          ) : null}
        </select>
      ) : field.input === "images" ? (
        <ImagePicker
          id={id}
          value={Array.isArray(value) ? value : []}
          photos={photos}
          readOnly={readOnly}
          onChange={onChange}
          describedBy={describedBy}
        />
      ) : (
        <input
          id={id}
          type={
            field.input === "url"
              ? "url"
              : field.input === "tel"
                ? "tel"
                : "text"
          }
          inputMode={field.input === "number" ? "decimal" : undefined}
          value={value ?? ""}
          readOnly={readOnly}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={state === "missing" ? true : undefined}
          aria-describedby={describedBy}
          className={input(state)}
        />
      )}

      <code id={`${id}-caption`} className={caption}>
        {[field.gbp, field.property].filter(Boolean).join(" · ")}
      </code>

      {field.disagrees ? (
        <span className="fhint:text-[12px] fhint:font-bold fhint:text-[#8a5a00]">
          {sprintf(
            /* translators: %s: Google's current value. */
            __(
              "Your website and Google disagree. Google now says: %s",
              "foundhint-local-seo",
            ),
            String(field.google_value ?? ""),
          )}
        </span>
      ) : null}
      {error ? (
        <span
          id={`${id}-error`}
          role="alert"
          className="fhint:text-[12px] fhint:font-bold fhint:text-[#C02718]"
        >
          {error}
        </span>
      ) : missing ? (
        <span className="fhint:text-[12px] fhint:font-bold fhint:text-[#C02718]">
          {__(
            "Google needs this for a local business result.",
            "foundhint-local-seo",
          )}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Up to three listing photos as `image`. Read-only: thumbnails; editing:
 * the listing's photos to choose from.
 */
function ImagePicker({ id, value, photos, readOnly, onChange, describedBy }) {
  const choices = readOnly
    ? value
    : Array.from(new Set([...value, ...(photos ?? [])]));

  if (!choices.length) {
    return (
      <span
        id={id}
        className="fhint:text-[13px] fhint:text-[#625e5e]"
        aria-describedby={describedBy}
      >
        {__("No photos on your Google profile yet.", "foundhint-local-seo")}
      </span>
    );
  }

  return (
    <div
      id={id}
      role="group"
      aria-describedby={describedBy}
      className="fhint:grid fhint:gap-2"
    >
      <span className="fhint:text-[13px] fhint:text-[#444141]">
        {sprintf(
          /* translators: 1: chosen photos, 2: photos on the profile. */
          __("%1$d chosen of %2$d Google photos", "foundhint-local-seo"),
          value.length,
          Math.max(value.length, photos?.length ?? 0),
        )}
      </span>
      <div className="fhint:flex fhint:flex-wrap fhint:gap-2">
        {choices.slice(0, readOnly ? 10 : 24).map((url, index) => {
          const on = value.includes(url);

          return readOnly ? (
            <img
              key={url}
              src={url}
              alt=""
              referrerPolicy="no-referrer"
              className="fhint:size-14 fhint:object-cover"
            />
          ) : (
            <button
              key={url}
              type="button"
              aria-pressed={on}
              onClick={() =>
                onChange(
                  on
                    ? value.filter((item) => item !== url)
                    : [...value, url].slice(0, 10),
                )
              }
              className={cn(
                "fhint:relative fhint:size-14 fhint:cursor-pointer fhint:overflow-hidden fhint:border-2 fhint:p-0",
                on
                  ? "fhint:border-[#FF6B35]"
                  : "fhint:border-transparent fhint:opacity-60",
              )}
            >
              <img
                src={url}
                alt=""
                referrerPolicy="no-referrer"
                className="fhint:size-full fhint:object-cover"
              />
              <span className="fhint:sr-only">
                {sprintf(
                  /* translators: %d: photo number. */
                  __("Photo %d", "foundhint-local-seo"),
                  index + 1,
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default FieldRow;
