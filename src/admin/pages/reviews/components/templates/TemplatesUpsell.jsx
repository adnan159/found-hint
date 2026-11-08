import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { activateUrl, licenseInactive, upgradeUrl } from "@/lib/pro";
import { help } from "@/pages/profile/styles";
import { primaryAction } from "../../styles";

/**
 * The Reply templates card without FoundHint Premium: what templates do,
 * and the way to them — Unlock, or Activate licence when Premium is
 * installed but not activated. No sample templates: nothing here can be
 * used without Premium, so nothing is shown as if it could.
 */
export function TemplatesUpsell() {
  const inactive = licenseInactive() && activateUrl();

  return (
    <div className="fhint:grid fhint:justify-items-start fhint:gap-3">
      <p className={cn(help, "fhint:m-0")}>
        {__(
          "Save your own replies for each star rating and location, and use them in one click when you reply. Auto-reply sends them for you.",
          "foundhint-local-seo",
        )}
      </p>
      <a
        href={inactive ? activateUrl() : upgradeUrl()}
        target={inactive ? undefined : "_blank"}
        rel={inactive ? undefined : "noopener noreferrer"}
        className={primaryAction}
      >
        {inactive
          ? __("Activate licence", "foundhint-local-seo")
          : __("Unlock with Premium", "foundhint-local-seo")}
      </a>
    </div>
  );
}

export default TemplatesUpsell;
