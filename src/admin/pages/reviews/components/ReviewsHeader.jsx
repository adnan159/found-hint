import Hint from "@/components/Hint";
import { pillButton } from "@/components/location-bar/styles";
import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { RefreshCwIcon } from "lucide-react";
import { useEffect, useRef } from "react";

/**
 * The Reviews title row, drawn the same way as the Business Profile's
 * (`pages/profile/components/header/TitleBar`): breadcrumb, title, an info
 * hint, and the button that reads reviews from Google on the right.
 *
 * `onSync` is absent until a Google listing is chosen for the location, and
 * the button is left out until then.
 */
export function ReviewsHeader({ ready, onSync, syncing }) {
  const headingRef = useRef(null);

  // A hash route change does not move focus, so the title takes it and the
  // screen is announced.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <header className="fhint:-mx-4 fhint:-mt-6 fhint:flex fhint:flex-col">
      <div
        className={cn(
          "fhint:box-border fhint:flex fhint:min-h-[68px] fhint:flex-wrap fhint:items-center fhint:gap-x-4 fhint:gap-y-3 fhint:px-4 fhint:py-2.5",
          ready
            ? "fhint:border-b fhint:border-b-border"
            : "fhint:border-b fhint:border-b-divider",
        )}
      >
        <div className="fhint:min-w-45 fhint:flex-1">
          <p className="fhint:m-0 fhint:text-[12.5px] fhint:font-semibold fhint:text-muted-strong">
            {__("FoundHint / Reviews", "foundhint-local-seo")}
          </p>
          <div className="fhint:flex fhint:items-center fhint:gap-1.5">
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="fhint:m-0 fhint:p-0 fhint:font-heading fhint:text-[21px] fhint:leading-tight fhint:font-extrabold fhint:tracking-[-0.02em] fhint:outline-none"
            >
              {__("Reviews", "foundhint-local-seo")}
            </h1>
            <Hint
              about={__("Reviews", "foundhint-local-seo")}
              side="bottom"
              align="start"
              text={__(
                "What customers say about this location on Google. Read, filter and reply to reviews in one place. Only syncing and replying contact Google.",
                "foundhint-local-seo",
              )}
            />
          </div>
        </div>

        {onSync ? (
          <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2">
            <button
              type="button"
              onClick={onSync}
              disabled={syncing}
              title={__(
                "Reads the latest reviews from Google. Nothing on Google is changed.",
                "foundhint-local-seo",
              )}
              className={pillButton}
            >
              <RefreshCwIcon
                aria-hidden="true"
                className={cn(
                  "fhint:size-3.5",
                  syncing && "fhint:animate-spin",
                )}
              />
              {syncing
                ? __("Syncing…", "foundhint-local-seo")
                : __("Sync reviews", "foundhint-local-seo")}
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}

export default ReviewsHeader;
