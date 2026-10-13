import { useState } from "react";
import { __, _n, sprintf } from "@wordpress/i18n";
import { cn } from "cn";
import { help, label, quietButton } from "../../styles";
import { thumb } from "./lib";

const PAGE = 24;

/**
 * The photos already on the listing, a page at a time.
 */
export function Gallery({ gallery }) {
  const [shown, setShown] = useState(PAGE);

  return (
    <div className="fhint:grid fhint:gap-2">
      <div className="fhint:flex fhint:items-baseline fhint:gap-2">
        <h3 className={cn(label, "fhint:m-0 fhint:text-sm")}>
          {__("Photo gallery", "foundhint-local-seo")}
        </h3>
        <span className={help}>
          {sprintf(
            /* translators: %d: number of photos. */
            _n("%d photo", "%d photos", gallery.length, "foundhint-local-seo"),
            gallery.length,
          )}
        </span>
      </div>
      <ul className="fhint:m-0 fhint:grid fhint:list-none fhint:grid-cols-[repeat(auto-fill,minmax(130px,1fr))] fhint:gap-2.5 fhint:p-0">
        {gallery.slice(0, shown).map((photo) => (
          <li
            key={photo.id}
            className="fhint:m-0 fhint:aspect-square fhint:overflow-hidden fhint:border fhint:border-border fhint:bg-muted"
          >
            {photo.url ? (
              <img
                src={thumb(photo.url)}
                alt={__("Photo on your Google listing", "foundhint-local-seo")}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="fhint:size-full fhint:object-cover"
              />
            ) : null}
          </li>
        ))}
      </ul>
      {gallery.length > shown ? (
        <span>
          <button
            type="button"
            onClick={() => setShown((count) => count + PAGE)}
            className={quietButton}
          >
            {__("Show more", "foundhint-local-seo")}
          </button>
        </span>
      ) : null}
    </div>
  );
}

export default Gallery;
