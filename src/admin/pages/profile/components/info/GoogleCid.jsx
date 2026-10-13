import { useState } from "react";
import { __ } from "@wordpress/i18n";
import { ExternalLinkIcon } from "lucide-react";
import { Link } from "react-router";
import { cn } from "cn";
import { primaryButton, quietButton } from "../../styles";

/**
 * Google's own id for the listing: shown, copied and opened in Maps once it
 * is known, and explained — with the way to get it — while it is not.
 */
export function GoogleCid({ cid, mapped }) {
  const [copied, setCopied] = useState(false);

  const copyCid = () => {
    try {
      navigator.clipboard?.writeText(cid);
    } catch {
      // Copying is a convenience; the id is on screen to be selected by hand.
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3 fhint:border fhint:border-border fhint:bg-muted fhint:px-[15px] fhint:py-[13px]">
      <div className="fhint:min-w-0 fhint:flex-1">
        <strong className="fhint:block fhint:text-[13px]">
          {__("Google CID", "foundhint-local-seo")}
        </strong>
        <span className="fhint:text-[12.5px] fhint:text-muted-strong">
          {cid
            ? __(
                "Google's own ID for this listing on Maps. You cannot change it, but some directories and tools ask for it.",
                "foundhint-local-seo",
              )
            : mapped
              ? __(
                  "Google's ID for your listing on Maps. It appears here the next time your listing is read from Google.",
                  "foundhint-local-seo",
                )
              : __(
                  "Google's ID for your listing on Maps. It appears here once you connect Google.",
                  "foundhint-local-seo",
                )}
        </span>
      </div>
      {cid ? (
        <span className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-[7px]">
          <code className="fhint:border fhint:border-border fhint:bg-card fhint:px-2.5 fhint:py-[7px] fhint:font-mono fhint:text-[12.5px]">
            {cid}
          </code>
          <button type="button" onClick={copyCid} className={quietButton}>
            <span aria-live="polite">
              {copied
                ? __("Copied", "foundhint-local-seo")
                : __("Copy", "foundhint-local-seo")}
            </span>
          </button>
          <a
            href={`https://maps.google.com/?cid=${encodeURIComponent(cid)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={quietButton}
          >
            {__("Open in Maps", "foundhint-local-seo")}
            <ExternalLinkIcon aria-hidden="true" className="fhint:size-3" />
          </a>
        </span>
      ) : null}
      {!cid && !mapped ? (
        <Link to="/google" className={cn(primaryButton, "fhint:no-underline")}>
          {__("Connect Google", "foundhint-local-seo")}
        </Link>
      ) : null}
    </div>
  );
}

export default GoogleCid;
