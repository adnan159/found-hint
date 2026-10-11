import { __, sprintf } from "@wordpress/i18n";
import { ExternalLinkIcon, MapPinIcon } from "lucide-react";
import { quietButton } from "../styles";
import MapPreview from "./MapPreview";
import TextField from "./TextField";

/**
 * Where the business is.
 *
 * Once the address has come from a verified Google listing it is read-only
 * here: Google does not let an app move a verified address, so letting this
 * screen edit it would only create a difference that can never be sent.
 *
 * The map shows where Google has the pin. It cannot be moved from here.
 */
export function AddressSection({ model, onChange, errors, address }) {
  const locked = Boolean(address?.locked);
  const set = (key) => (value) => onChange({ ...model, [key]: value });

  const latitude = address?.latitude;
  const longitude = address?.longitude;
  const hasPin =
    latitude !== null &&
    latitude !== undefined &&
    longitude !== null &&
    longitude !== undefined &&
    latitude !== "" &&
    longitude !== "";

  const field = (key, label, extra = {}) => (
    <TextField
      label={label}
      value={model[key]}
      onChange={set(key)}
      error={errors?.[key]}
      readOnly={locked}
      {...extra}
    />
  );

  return (
    <>
      {locked ? (
        <div
          role="note"
          className="fhint:border fhint:border-[#F0D9AE] fhint:bg-[#FBF0DE] fhint:px-[15px] fhint:py-[13px] fhint:text-[13px] fhint:leading-normal fhint:text-[#7a4a05]"
        >
          {__(
            "For your safety, Google does not let apps change a verified address. To move your address, update it in your Google Business Profile and FoundHint will pick up the change on the next sync.",
            "foundhint-local-seo",
          )}
        </div>
      ) : null}

      <div className="fhint:grid fhint:grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] fhint:gap-[18px]">
        {field("address_line_1", __("Street address", "foundhint-local-seo"))}
        {field(
          "address_line_2",
          __("Suite, floor or unit", "foundhint-local-seo"),
        )}
        {field("city", __("City", "foundhint-local-seo"))}
        {field("region", __("State or region", "foundhint-local-seo"))}
        {field("postal_code", __("Postal code", "foundhint-local-seo"))}
        {field("country", __("Country", "foundhint-local-seo"), {
          maxLength: 2,
          help: locked
            ? undefined
            : __("Two letters, such as US or BD.", "foundhint-local-seo"),
        })}
      </div>

      {hasPin ? (
        <MapPreview
          latitude={latitude}
          longitude={longitude}
          label={
            address?.formatted || __("Your location", "foundhint-local-seo")
          }
        />
      ) : null}

      <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3 fhint:border fhint:border-border fhint:bg-muted fhint:px-[15px] fhint:py-[13px]">
        <MapPinIcon
          aria-hidden="true"
          className="fhint:size-4 fhint:flex-none fhint:text-primary"
        />
        <div className="fhint:min-w-0 fhint:flex-1">
          <strong className="fhint:block fhint:text-[13px]">
            {__("Map pin", "foundhint-local-seo")}
          </strong>
          <span className="fhint:text-[12.5px] fhint:text-muted-strong">
            {hasPin
              ? sprintf(
                  /* translators: 1: latitude, 2: longitude. */
                  __("Map pin at %1$s, %2$s", "foundhint-local-seo"),
                  Number(latitude).toFixed(4),
                  Number(longitude).toFixed(4),
                )
              : __(
                  "No map pin yet. It is filled in from your Google listing.",
                  "foundhint-local-seo",
                )}
          </span>
        </div>
        {hasPin ? (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={quietButton}
          >
            {__("Open in Maps", "foundhint-local-seo")}
            <ExternalLinkIcon aria-hidden="true" className="fhint:size-3" />
          </a>
        ) : null}
        {locked ? (
          <a
            href="https://business.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className={quietButton}
          >
            {__("Change address on Google", "foundhint-local-seo")}
            <ExternalLinkIcon aria-hidden="true" className="fhint:size-3" />
          </a>
        ) : null}
      </div>
    </>
  );
}

export default AddressSection;
