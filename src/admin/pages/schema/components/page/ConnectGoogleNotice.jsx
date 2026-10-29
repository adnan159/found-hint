import { __ } from "@wordpress/i18n";
import { Link2Icon } from "lucide-react";
import { cn } from "cn";
import { panelTitle, primaryAction } from "../styles";

/**
 * Shown in place of the tabs while no Google Business Profile is connected:
 * schema is built from it, so there is nothing to set up yet.
 */
export function ConnectGoogleNotice() {
  return (
    <section className="fhint:grid fhint:justify-items-start fhint:gap-3 fhint:border fhint:border-border fhint:bg-card fhint:px-6 fhint:py-8">
      <h2 className={panelTitle}>
        {__(
          "Connect your Google Business Profile to set up schema",
          "foundhint-local-seo",
        )}
      </h2>
      <p className="fhint:m-0 fhint:max-w-[60ch] fhint:text-[13.5px] fhint:leading-relaxed fhint:text-foreground-soft">
        {__(
          "Your schema is built from your Business Profile: name, address, phone and hours come from Google, and you can edit any of them for your website. Nothing changes on your site until you connect.",
          "foundhint-local-seo",
        )}
      </p>
      <a
        href="#/google"
        className={cn(
          primaryAction,
          "fhint:text-primary-foreground! fhint:no-underline",
        )}
      >
        <Link2Icon aria-hidden="true" className="fhint:size-4" />
        {__("Connect Google", "foundhint-local-seo")}
      </a>
    </section>
  );
}

export default ConnectGoogleNotice;
