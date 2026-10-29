import Hint from "@/components/Hint";
import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { LinkIcon, RefreshCwIcon, SendIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link } from "react-router";
import { pillButton, pillLink } from "./styles";

/**
 * The page's own title, whether Google is connected, and the buttons that
 * read the listing from Google and send the saved profile to it — or, before
 * that is possible, the way to connect.
 *
 * `meta` is absent while the profile loads; the title is drawn regardless,
 * and carries the rule that meets the sidebar's until the business bar above
 * it arrives.
 */
export function TitleBar({
  meta,
  onPublish,
  publishDisabled,
  publishHint,
  onRefresh,
  isRefreshing,
  refreshDisabled,
}) {
  const headingRef = useRef(null);

  // The same courtesy PageHeader pays: a hash route change does not move
  // focus, so the title takes it and the screen is announced.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const google = meta?.google ?? {};

  return (
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
          {google.mapped && onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing || refreshDisabled}
              title={__(
                "Reads your attributes and photos from Google. Nothing on Google is changed.",
                "foundhint-local-seo",
              )}
              className={pillButton}
            >
              <RefreshCwIcon
                aria-hidden="true"
                className={cn(
                  "fhint:size-3.5",
                  isRefreshing && "fhint:animate-spin",
                )}
              />
              {isRefreshing
                ? __("Reading Google…", "foundhint-local-seo")
                : __("Refresh from Google", "foundhint-local-seo")}
            </button>
          ) : null}
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
                pillButton,
                "fhint:border-primary fhint:bg-primary fhint:text-primary-foreground fhint:hover:bg-primary/90 fhint:disabled:border-border fhint:disabled:bg-border",
              )}
            >
              <SendIcon aria-hidden="true" className="fhint:size-3.5" />
              {__("Send to Google", "foundhint-local-seo")}
            </button>
          ) : (
            <Link to="/google" className={pillLink}>
              <LinkIcon aria-hidden="true" className="fhint:size-3.5" />
              {google.connected
                ? __("Choose a listing", "foundhint-local-seo")
                : __("Connect Google", "foundhint-local-seo")}
            </Link>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default TitleBar;
