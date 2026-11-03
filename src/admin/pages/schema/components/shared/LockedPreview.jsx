import { __ } from "@wordpress/i18n";
import { LockIcon } from "lucide-react";
import { cn } from "cn";
import { activateUrl, licenseInactive, upgradeUrl } from "@/lib/pro";
import { primaryAction } from "../styles";

// Sample markup only — never the site's data. Blurred behind the card so
// the owner sees the shape of what Premium prints.
const SAMPLE = `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Dentist",
  "@id": "https://smiledental.example/#business",
  "name": "Smile Dental Banani",
  "telephone": "+880-1712-345670",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "House 54, Road 11",
    "addressLocality": "Dhaka",
    "addressCountry": "BD"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 23.7937,
    "longitude": 90.4066
  },
  "openingHoursSpecification": [ … ]
}
</script>`;

/**
 * The JSON-LD preview without FoundHint Premium: the panel's frame with
 * sample markup, blurred and hidden from assistive technology, under a card
 * that links to Premium — or, with Premium installed but not activated, to
 * the licence activation. The rest of the tab stays visible, read-only.
 */
export function LockedPreview({ className }) {
  const inactive = licenseInactive() && activateUrl();

  return (
    <aside
      aria-label={__("JSON-LD preview", "foundhint-local-seo")}
      className={cn(
        "fhint:sticky fhint:top-4 fhint:min-w-0 fhint:flex-[1_1_380px] fhint:2xl:flex-[0.6_1_380px] fhint:border fhint:border-border fhint:bg-[#1d1b1a] fhint:text-white",
        className,
      )}
    >
      <div className="fhint:flex fhint:items-center fhint:gap-2.5 fhint:border-b fhint:border-b-[#34302f] fhint:px-4.5 fhint:py-3.25 fhint:text-[13px] fhint:font-bold">
        <LockIcon aria-hidden="true" className="fhint:size-3.5" />
        {__("JSON-LD preview", "foundhint-local-seo")}
      </div>

      <div className="fhint:relative fhint:min-h-90">
        <pre
          aria-hidden="true"
          inert
          className="fhint:pointer-events-none fhint:m-0 fhint:overflow-hidden fhint:px-4.5 fhint:py-4 fhint:font-mono fhint:text-[12px] fhint:leading-[1.75] fhint:text-[#cfcaca] fhint:blur-sm fhint:select-none"
        >
          {SAMPLE}
        </pre>

        <div className="fhint:absolute fhint:inset-0 fhint:grid fhint:place-items-center fhint:p-4">
          <div className="fhint:grid fhint:max-w-80 fhint:justify-items-center fhint:gap-2.5 fhint:bg-card fhint:px-5 fhint:py-5 fhint:text-center fhint:text-foreground fhint:shadow-lg">
            <span
              aria-hidden="true"
              className="fhint:grid fhint:size-10 fhint:place-items-center fhint:bg-[#FFF1EB] fhint:text-[#D8521F]"
            >
              <LockIcon className="fhint:size-4.5" />
            </span>
            <strong className="fhint:text-[15px]">
              {__("Schema preview is a Premium feature", "foundhint-local-seo")}
            </strong>
            <span className="fhint:text-[13px] fhint:leading-relaxed fhint:text-muted-strong">
              {inactive
                ? __(
                    "FoundHint Premium is installed but its licence isn't active.",
                    "foundhint-local-seo",
                  )
                : __(
                    "See and edit the exact markup each schema adds to your site.",
                    "foundhint-local-seo",
                  )}
            </span>
            <a
              href={inactive ? activateUrl() : upgradeUrl()}
              target={inactive ? undefined : "_blank"}
              rel={inactive ? undefined : "noopener noreferrer"}
              className={primaryAction}
            >
              <LockIcon aria-hidden="true" className="fhint:size-4" />
              {inactive
                ? __("Activate licence", "foundhint-local-seo")
                : __("Unlock with Premium", "foundhint-local-seo")}
              {inactive ? null : (
                <span className="fhint:sr-only">
                  {__("(opens in a new tab)", "foundhint-local-seo")}
                </span>
              )}
            </a>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default LockedPreview;
