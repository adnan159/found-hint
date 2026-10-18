import { __ } from "@wordpress/i18n";

/**
 * A Google map of the location.
 *
 * Google's own embed, in a frame, so the map is the one customers see in
 * Search and Maps. It needs no API key. The page is loaded by the browser of
 * whoever is looking at this screen — declared in the readme under External
 * services — and only on this admin screen, never on a visitor-facing page.
 *
 * It centres on the pin when the location has one. Without one — Google
 * does not always send coordinates for a listing — it searches for the
 * business by name and address, which finds the listing itself rather than
 * just the street. Either way it is a picture of where Google has the
 * business, not a control: the position is Google's.
 *
 * @param {Object} props
 * @param {?number|string} props.latitude  Pin latitude, if any.
 * @param {?number|string} props.longitude Pin longitude, if any.
 * @param {string}         props.query     Name and address, for no pin.
 * @param {string}         props.label     What the map shows, for its title.
 */
export function MapPreview({ latitude, longitude, query, label }) {
  const place = mapQuery({ latitude, longitude, query });

  if (!place) {
    return null;
  }

  const src = `https://www.google.com/maps?${new URLSearchParams({
    q: place,
    z: "16",
    output: "embed",
  })}`;

  return (
    <iframe
      src={src}
      title={label || __("Map of your location", "foundhint-local-seo")}
      loading="lazy"
      // Google's page learns it was framed by this admin screen and no more:
      // no path, so no screen name or location id goes with it.
      referrerPolicy="no-referrer"
      className="fhint:block fhint:h-[260px] fhint:w-full fhint:border fhint:border-border fhint:bg-muted"
    />
  );
}

/**
 * What to ask Google Maps for: the pin when there is one, else the business
 * by name and address, else nothing to show.
 *
 * @param {Object} where
 * @return {string}
 */
export function mapQuery({ latitude, longitude, query }) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  const hasPin =
    latitude !== null &&
    latitude !== undefined &&
    latitude !== "" &&
    longitude !== null &&
    longitude !== undefined &&
    longitude !== "" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng);

  if (hasPin) {
    return `${lat},${lng}`;
  }

  return String(query ?? "").trim();
}

export default MapPreview;
