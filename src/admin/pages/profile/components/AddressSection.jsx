import { __, sprintf } from "@wordpress/i18n";
import { ExternalLinkIcon, MapPinIcon } from "lucide-react";
import { quietLink } from "../styles";
import MapPreview, { mapQuery } from "./MapPreview";
import TextField from "./TextField";
import ServiceAreaField from "./address/ServiceAreaField";

/**
 * Where the business is.
 *
 * Once the address has come from a verified Google listing it is read-only
 * here: Google does not let an app move a verified address, so letting this
 * screen edit it would only create a difference that can never be sent.
 *
 * The map is Google's: at the pin when there is one, else the business
 * found by name and address. It cannot be moved from here.
 */
export function AddressSection({
  model,
  onChange,
  errors,
  address,
  businessName,
}) {
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
  // With no pin the map looks the business up by name and address, as the
  // address stands in the form — so it follows an edit before it is saved.
  const addressText = [
    model.address_line_1,
    model.address_line_2,
    model.city,
    model.region,
    model.postal_code,
    model.country,
  ]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(", ");
  const mapSearch = addressText
    ? [businessName, addressText].filter(Boolean).join(", ")
    : "";
  const showMap = Boolean(mapQuery({ latitude, longitude, query: mapSearch }));

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
          className="fhint:border fhint:border-warning-border fhint:bg-warning fhint:px-[15px] fhint:py-[13px] fhint:text-[13px] fhint:leading-normal fhint:text-warning-foreground"
        >
          {__(
            "For your safety, Google does not let apps change a verified address. To move your address, update it in your Google Business Profile and FoundHint will pick up the change on the next sync.",
            "foundhint-local-seo",
          )}
        </div>
      ) : null}

      <div className="fhint:grid fhint:grid-cols-1 fhint:gap-[18px] fhint:md:grid-cols-3">
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
          hint: locked
            ? undefined
            : __("Two letters, such as US or BD.", "foundhint-local-seo"),
        })}
      </div>

      {showMap ? (
        <MapPreview
          latitude={latitude}
          longitude={longitude}
          query={mapSearch}
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
        {showMap ? (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery({ latitude, longitude, query: mapSearch }))}`}
            target="_blank"
            rel="noopener noreferrer"
            className={quietLink}
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
            className={quietLink}
          >
            {__("Change address on Google", "foundhint-local-seo")}
            <ExternalLinkIcon aria-hidden="true" className="fhint:size-3" />
          </a>
        ) : null}
      </div>

      {/* After the map: the places served beyond the address. Editable
          even when the address is Google's. */}
      <ServiceAreaField
        value={model.service_area}
        onChange={set("service_area")}
        errors={errors}
        max={address?.service_area_max ?? 20}
      />
    </>
  );
}

export default AddressSection;
