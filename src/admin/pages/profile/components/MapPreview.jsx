import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * A small map with the listing's pin on it.
 *
 * The map library is bundled with the plugin. The map *tiles* are not — a
 * map of the world cannot be — and are fetched from OpenStreetMap by the
 * browser of whoever is looking at this screen; that is declared in the
 * plugin's readme under External services. Nothing about the business is
 * sent beyond which squares of the map are being looked at.
 *
 * It is a picture of where the pin is, not a control: the pin cannot be
 * dragged, because the position is Google's and is read from the listing.
 * Scroll-wheel zoom is off so the page scrolls past it.
 */
export function MapPreview({ latitude, longitude, label }) {
  const node = useRef(null);

  useEffect(() => {
    if (!node.current) {
      return undefined;
    }

    const center = [Number(latitude), Number(longitude)];
    const map = L.map(node.current, { scrollWheelZoom: false }).setView(
      center,
      15,
    );

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    }).addTo(map);

    // A drawn circle rather than Leaflet's image marker: it needs no image
    // file, and it is the pin the design shows.
    const pin = L.circleMarker(center, {
      radius: 9,
      color: "#ffffff",
      weight: 3,
      fillColor: "#ff6b35",
      fillOpacity: 1,
    }).addTo(map);

    if (label) {
      // As text, never as HTML: the label is the business's own name.
      pin.bindTooltip(document.createTextNode(label).textContent ?? "");
    }

    // The section may have been collapsed when the map was made; measure
    // again once it has a size.
    const settle = window.setTimeout(() => map.invalidateSize(), 150);

    return () => {
      window.clearTimeout(settle);
      map.remove();
    };
  }, [latitude, longitude, label]);

  return (
    <div
      ref={node}
      role="img"
      aria-label={label}
      // Its own stacking context, so the map's layers stay under the page's
      // save bar and dialogs instead of floating over them.
      className="fhint:relative fhint:z-0 fhint:isolate fhint:h-[260px] fhint:w-full fhint:border fhint:border-border fhint:bg-muted"
    />
  );
}

export default MapPreview;
