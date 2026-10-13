import logoUrl from "@/assets/foundhint-icon.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { __, _n, sprintf } from "@wordpress/i18n";
import Hint from "@/components/Hint";
import { cn } from "cn";
import {
  ArrowLeftRightIcon,
  ExternalLinkIcon,
  LinkIcon,
  SendIcon,
  StarIcon,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { Link } from "react-router";
import { focus } from "../styles";

// The header's pill buttons. Rounded, unlike the square controls inside the
// sections — that is the design's own distinction between the bar that says
// which business this is and the form that edits it.
const pill = cn(
  "fhint:inline-flex fhint:h-9 fhint:cursor-pointer fhint:items-center fhint:gap-2 fhint:rounded-full fhint:border fhint:border-border fhint:bg-card fhint:px-4 fhint:text-[13px] fhint:font-bold fhint:whitespace-nowrap fhint:text-foreground fhint:no-underline fhint:hover:bg-muted fhint:disabled:cursor-not-allowed fhint:disabled:text-muted-foreground",
  focus,
);

/**
 * Which business and which location the screen is showing, and the page's
 * own title row beneath it.
 *
 * The name line reads "Business, Location" when a location has a name of
 * its own, and the business name alone when it does not — a single-location
 * business usually names its only location after itself, and saying the same
 * words twice helps nobody.
 *
 * "Switch location" is drawn only when there is another location to switch
 * to. The design's notification bell and account avatar are not drawn:
 * nothing produces notifications yet, and WordPress's own toolbar already
 * shows who is signed in.
 */
export function ProfileHeader({
  info,
  meta,
  onSwitch,
  onPublish,
  publishDisabled,
  publishHint,
}) {
  const headingRef = useRef(null);

  // The same courtesy PageHeader pays: a hash route change does not move
  // focus, so the title takes it and the screen is announced.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const google = meta?.google ?? {};
  const location = meta?.location;
  const locations = meta?.locations ?? [];
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
    <header className="fhint:-mx-4 fhint:-mt-6 fhint:flex fhint:flex-col">
      {meta ? (
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
                  pill,
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

            {locations.length > 1 ? (
              <DropdownMenu>
                <DropdownMenuTrigger className={pill}>
                  <ArrowLeftRightIcon
                    aria-hidden="true"
                    className="fhint:size-3.5"
                  />
                  {__("Switch location", "foundhint-local-seo")}
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="fhint:w-[300px] fhint:rounded-none"
                >
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>
                      {__("Show the profile of", "foundhint-local-seo")}
                    </DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={String(location?.id ?? "")}
                      onValueChange={(value) => onSwitch(Number(value))}
                    >
                      {locations.map((item) => (
                        <DropdownMenuRadioItem
                          key={item.id}
                          value={String(item.id)}
                          className="fhint:cursor-pointer fhint:items-start fhint:rounded-none"
                        >
                          <span className="fhint:grid fhint:min-w-0 fhint:gap-0.5">
                            <span className="fhint:font-bold">
                              {item.name}
                              {item.is_primary ? (
                                <span className="fhint:ml-2 fhint:text-[10px] fhint:font-extrabold fhint:tracking-[0.07em] fhint:text-muted-strong fhint:uppercase">
                                  {__("Main", "foundhint-local-seo")}
                                </span>
                              ) : null}
                            </span>
                            {item.address ? (
                              <span className="fhint:text-[12.5px] fhint:text-muted-strong">
                                {item.address}
                              </span>
                            ) : null}
                          </span>
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}

            {cid ? (
              <a
                href={`https://maps.google.com/?cid=${encodeURIComponent(cid)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={pill}
              >
                <ExternalLinkIcon
                  aria-hidden="true"
                  className="fhint:size-3.5"
                />
                {__("View on Google", "foundhint-local-seo")}
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          "fhint:box-border fhint:flex fhint:min-h-[68px] fhint:flex-wrap fhint:items-center fhint:gap-x-4 fhint:gap-y-3 fhint:px-4 fhint:py-2.5",
          // Whichever row is on top carries the heavy rule that meets the
          // sidebar's; the business bar above takes it once it has loaded.
          meta
            ? "fhint:border-b fhint:border-b-border"
            : "fhint:border-b fhint:border-b-divider",
        )}
      >
        <div className="fhint:min-w-45 fhint:flex-1">
          <p className="fhint:m-0 fhint:text-[12.5px] fhint:font-semibold fhint:text-muted-strong">
            {__("FoundHint / Business Profile", "foundhint-local-seo")}
          </p>
          <div className="fhint:flex fhint:items-center fhint:gap-1.5">
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="fhint:m-0 fhint:p-0 fhint:font-heading fhint:text-[21px] fhint:leading-tight fhint:font-extrabold fhint:tracking-[-0.02em] fhint:outline-none"
            >
              {__("Business Profile", "foundhint-local-seo")}
            </h1>
            <Hint
              about={__("Business Profile", "foundhint-local-seo")}
              side="bottom"
              align="start"
              text={__(
                "Your business name, address, hours, links, attributes, services and photos, all in one place. FoundHint uses these details for your website markup and your location pages.",
                "foundhint-local-seo",
              )}
            />
          </div>
        </div>

        {meta ? (
          <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2">
            <span
              className={cn(
                "fhint:inline-flex fhint:h-9 fhint:items-center fhint:gap-2 fhint:rounded-full fhint:px-4 fhint:text-[13px] fhint:font-bold fhint:whitespace-nowrap",
                google.mapped
                  ? "fhint:bg-[#E8F3ED] fhint:text-success"
                  : "fhint:bg-[#eae7e7] fhint:text-muted-strong",
              )}
            >
              <span
                aria-hidden="true"
                className="fhint:size-2 fhint:rounded-full fhint:bg-current"
              />
              {google.mapped
                ? __("Google connected", "foundhint-local-seo")
                : google.connected
                  ? __("No Google listing chosen", "foundhint-local-seo")
                  : __("Google not connected", "foundhint-local-seo")}
            </span>
            {google.mapped ? (
              <button
                type="button"
                onClick={onPublish}
                disabled={publishDisabled}
                title={publishHint}
                className={cn(
                  pill,
                  "fhint:border-primary fhint:bg-primary fhint:text-primary-foreground fhint:hover:bg-primary/90 fhint:disabled:border-border fhint:disabled:bg-border",
                )}
              >
                <SendIcon aria-hidden="true" className="fhint:size-3.5" />
                {__("Send to Google", "foundhint-local-seo")}
              </button>
            ) : (
              <Link to="/google" className={pill}>
                <LinkIcon aria-hidden="true" className="fhint:size-3.5" />
                {google.connected
                  ? __("Choose a listing", "foundhint-local-seo")
                  : __("Connect Google", "foundhint-local-seo")}
              </Link>
            )}
          </div>
        ) : null}
      </div>
    </header>
  );
}

export default ProfileHeader;
