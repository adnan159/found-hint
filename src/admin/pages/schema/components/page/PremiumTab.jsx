import { __ } from "@wordpress/i18n";
import { KeyRoundIcon, LockIcon } from "lucide-react";
import { cn } from "cn";
import { activateUrl, licenseInactive, upgradeUrl } from "@/lib/pro";
import { muted, panel, panelTitle, primaryAction } from "../styles";

/**
 * A tab that is part of FoundHint Premium, opened without it: what the tab
 * does, and the way to get it — or, with Premium installed but its licence
 * not active, the way to activate it.
 */
export function PremiumTab({ title, body }) {
  const inactive = licenseInactive() && activateUrl();

  return (
    <section
      className={cn(
        panel,
        "fhint:grid fhint:justify-items-start fhint:gap-2.5 fhint:px-5 fhint:py-6",
      )}
    >
      <h2
        className={cn(panelTitle, "fhint:flex fhint:items-center fhint:gap-2")}
      >
        <LockIcon
          aria-hidden="true"
          className="fhint:size-4 fhint:text-muted-foreground"
        />
        {title}
        <span className="fhint:rounded-full fhint:bg-[#FFF1EB] fhint:px-2 fhint:py-0.5 fhint:text-[11px] fhint:font-bold fhint:text-[#D8521F]">
          {__("Premium", "foundhint-local-seo")}
        </span>
      </h2>
      <p
        className={cn(
          muted,
          "fhint:m-0 fhint:max-w-[60ch] fhint:leading-relaxed",
        )}
      >
        {body}{" "}
        {inactive
          ? __(
              "Premium is installed; activate its licence to use it.",
              "foundhint-local-seo",
            )
          : __("It's part of FoundHint Premium.", "foundhint-local-seo")}
      </p>
      {inactive ? (
        <a href={activateUrl()} className={primaryAction}>
          <KeyRoundIcon aria-hidden="true" className="fhint:size-4" />
          {__("Activate licence", "foundhint-local-seo")}
        </a>
      ) : (
        <a
          href={upgradeUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className={primaryAction}
        >
          {__("Get Premium", "foundhint-local-seo")}
          <span className="fhint:sr-only">
            {__("(opens in a new tab)", "foundhint-local-seo")}
          </span>
        </a>
      )}
    </section>
  );
}

export default PremiumTab;
