import { useState } from "react";
import { __ } from "@wordpress/i18n";
import { SettingsIcon, ZapIcon } from "lucide-react";
import { cn } from "cn";
import { focus } from "@/pages/profile/styles";
import AutoReplySetup from "./AutoReplySetup";
import SoonTag from "./SoonTag";

/**
 * The auto-reply band across the top of the screen.
 *
 * Auto-reply is coming in FoundHint Pro: the band shows what it will do,
 * "Set up" opens the settings as a preview, and the switch stays off. No
 * figure on it is invented — nothing has been sent automatically.
 */
export function AutoReplyBanner() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <section
        aria-label={__("Auto-reply", "foundhint-local-seo")}
        className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-x-6 fhint:gap-y-3 fhint:bg-[#1f1d1c] fhint:px-5 fhint:py-4 fhint:text-white"
      >
        <span
          aria-hidden="true"
          className="fhint:grid fhint:size-9 fhint:flex-none fhint:place-items-center fhint:border fhint:border-white/15 fhint:text-primary"
        >
          <ZapIcon className="fhint:size-4" />
        </span>
        <div className="fhint:grid fhint:min-w-[220px] fhint:flex-1 fhint:gap-1">
          <span className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2">
            <strong className="fhint:text-[15px] fhint:font-extrabold">
              {__("Auto-reply", "foundhint-local-seo")}
            </strong>
            <SoonTag />
          </span>
          <span className="fhint:text-[13px] fhint:text-white/75">
            {__(
              "Choose a template or an AI reply for each star rating, then switch it on.",
              "foundhint-local-seo",
            )}
          </span>
        </div>

        <div className="fhint:flex fhint:items-center fhint:gap-6 fhint:border-l fhint:border-white/15 fhint:pl-6">
          <span className="fhint:grid">
            <strong className="fhint:text-[22px] fhint:leading-none fhint:font-extrabold">
              0
            </strong>
            <span className="fhint:mt-1 fhint:text-[11.5px] fhint:text-white/65">
              {__("Auto-replies sent", "foundhint-local-seo")}
            </span>
          </span>
          <span className="fhint:grid">
            <strong className="fhint:text-[22px] fhint:leading-none fhint:font-extrabold">
              —
            </strong>
            <span className="fhint:mt-1 fhint:text-[11.5px] fhint:text-white/65">
              {__("AI replies left", "foundhint-local-seo")}
            </span>
          </span>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "fhint:inline-flex fhint:cursor-pointer fhint:items-center fhint:gap-2 fhint:border fhint:border-white/25 fhint:bg-white fhint:px-3 fhint:py-2 fhint:text-[12.5px] fhint:font-extrabold fhint:text-foreground fhint:hover:bg-white/90",
            focus,
          )}
        >
          <SettingsIcon aria-hidden="true" className="fhint:size-3.5" />
          {__("Set up", "foundhint-local-seo")}
        </button>

        <span className="fhint:flex fhint:items-center fhint:gap-2 fhint:text-[11px] fhint:font-extrabold fhint:tracking-[0.08em] fhint:text-white/60 fhint:uppercase">
          {__("Off", "foundhint-local-seo")}
          <span
            role="switch"
            aria-checked="false"
            aria-disabled="true"
            aria-label={__("Auto-reply (coming soon)", "foundhint-local-seo")}
            className="fhint:relative fhint:inline-block fhint:h-5 fhint:w-9 fhint:bg-white/20"
          >
            <span className="fhint:absolute fhint:top-0.5 fhint:left-0.5 fhint:size-4 fhint:bg-white/70" />
          </span>
        </span>
      </section>

      {open ? <AutoReplySetup onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export default AutoReplyBanner;
