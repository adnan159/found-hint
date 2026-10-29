import { __ } from "@wordpress/i18n";
import { Link2Icon } from "lucide-react";
import { cn } from "cn";
import { dialogButton } from "../styles";

/**
 * Shown in place of the tabs while no Google Business Profile is connected:
 * schema is built from it, so there is nothing to set up yet.
 */
export function ConnectGoogleNotice() {
  return (
    <section className="fhint:grid fhint:justify-items-start fhint:gap-3 fhint:border fhint:border-[#e6e3e3] fhint:bg-card fhint:px-6 fhint:py-8">
      <h2 className="fhint:m-0 fhint:text-[18px] fhint:font-bold">
        {__(
          "Connect your Google Business Profile to set up schema",
          "foundhint-local-seo",
        )}
      </h2>
      <p className="fhint:m-0 fhint:max-w-[60ch] fhint:text-[13.5px] fhint:leading-relaxed fhint:text-[#444141]">
        {__(
          "Your schema is built from your Business Profile: name, address, phone and hours come from Google, and you can edit any of them for your website. Nothing changes on your site until you connect.",
          "foundhint-local-seo",
        )}
      </p>
      <a
        href="#/google"
        className={cn(
          dialogButton,
          "fhint:inline-flex fhint:items-center fhint:gap-2 fhint:border-0 fhint:bg-[#FF6B35] fhint:text-white! fhint:no-underline",
        )}
      >
        <Link2Icon aria-hidden="true" className="fhint:size-4" />
        {__("Connect Google", "foundhint-local-seo")}
      </a>
    </section>
  );
}

export default ConnectGoogleNotice;
