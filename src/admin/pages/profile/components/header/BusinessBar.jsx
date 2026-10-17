import logoUrl from "@/assets/foundhint-icon.png";
import { __, _n, sprintf } from "@wordpress/i18n";
import { cn } from "cn";
import { ExternalLinkIcon, StarIcon } from "lucide-react";
import { Link } from "react-router";
import LocationSwitcher, { switcherEntries } from "./LocationSwitcher";
import { pillButton } from "./styles";

/**
 * Which business and which location the screen is showing.
 *
 * The name line reads "Business, Location" when a location has a name of
 * its own, and the business name alone when it does not — a single-location
 * business usually names its only location after itself, and saying the same
 * words twice helps nobody.
 *
 * "Switch location" is drawn when there is anything else to switch to: another
 * location here, or another listing on the Google account. The design's notification bell and account avatar are not drawn:
 * nothing produces notifications yet, and WordPress's own toolbar already
 * shows who is signed in.
 *
 * This is the row that lines up with the sidebar's logo block: same height,
 * same rule.
 */
export function BusinessBar({ info, meta, onSwitch, switching, switchError }) {
  const location = meta?.location;
  // The locations here and every other listing on the Google account: an
  // account with two listings can switch between them before either has
  // been imported.
  const entries = switcherEntries(meta?.locations, meta?.listings);
  const reviews = meta?.reviews;
  const cid = info?.cid ?? "";

  const business = info?.name ?? "";
  const place =
    location?.name && location.name !== business ? location.name : "";
  const name =
    [business, place].filter(Boolean).join(", ") ||
    __("Your business", "foundhint-local-seo");
  const detail = [info?.primary_category, location?.address]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <div className="fhint:box-border fhint:flex fhint:min-h-[68px] fhint:flex-wrap fhint:items-center fhint:gap-x-4 fhint:gap-y-3 fhint:border-b fhint:border-b-divider fhint:bg-card fhint:px-4 fhint:py-2.5">
      <span
        aria-hidden="true"
        className="fhint:grid fhint:size-11 fhint:flex-none fhint:place-items-center fhint:rounded-xl fhint:border fhint:border-border fhint:bg-card"
      >
        <img src={logoUrl} alt="" width={26} height={26} />
      </span>
      <div className="fhint:min-w-[180px] fhint:flex-1">
        <p className="fhint:m-0 fhint:truncate fhint:text-[16px] fhint:leading-tight fhint:font-extrabold fhint:tracking-[-0.01em]">
          {name}
        </p>
        {detail ? (
          <p className="fhint:m-0 fhint:truncate fhint:text-[13px] fhint:text-muted-strong">
            {detail}
          </p>
        ) : null}
      </div>

      <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2">
        {reviews ? (
          <Link
            to="/reviews"
            className={cn(
              pillButton,
              "fhint:border-[#F0D9AE] fhint:bg-[#FBF0DE] fhint:text-[#7a4a05] fhint:hover:bg-[#F7E6C8]",
            )}
          >
            <StarIcon
              aria-hidden="true"
              className="fhint:size-3.5 fhint:fill-current"
            />
            <span className="fhint:font-extrabold">
              <span className="fhint:sr-only">
                {__("Rated", "foundhint-local-seo")}{" "}
              </span>
              {Number(reviews.average).toFixed(1)}
              <span className="fhint:sr-only">
                {" "}
                {__("out of 5", "foundhint-local-seo")}
              </span>
            </span>
            <span className="fhint:font-semibold">
              ·{" "}
              {sprintf(
                /* translators: %d: number of reviews. */
                _n(
                  "%d review",
                  "%d reviews",
                  reviews.count,
                  "foundhint-local-seo",
                ),
                reviews.count,
              )}
            </span>
          </Link>
        ) : null}

        {entries.length > 1 ? (
          <LocationSwitcher
            entries={entries}
            location={location}
            onSwitch={onSwitch}
            busy={switching}
          />
        ) : null}

        {cid ? (
          <a
            href={`https://maps.google.com/?cid=${encodeURIComponent(cid)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={pillButton}
          >
            <ExternalLinkIcon aria-hidden="true" className="fhint:size-3.5" />
            {__("View on Google", "foundhint-local-seo")}
          </a>
        ) : null}
      </div>
      {switchError ? (
        <p
          role="alert"
          className="fhint:m-0 fhint:w-full fhint:text-[13px] fhint:font-semibold fhint:text-destructive"
        >
          {switchError}
        </p>
      ) : null}
    </div>
  );
}

export default BusinessBar;
