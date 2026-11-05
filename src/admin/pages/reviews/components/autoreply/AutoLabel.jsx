import { __ } from "@wordpress/i18n";
import { ZapIcon } from "lucide-react";

/** "Sent by auto-reply", beside a reply auto-reply wrote. */
export function AutoLabel() {
  return (
    <span className="fhint:inline-flex fhint:items-center fhint:gap-1 fhint:rounded-full fhint:bg-[#FFF1EB] fhint:px-2 fhint:py-0.5 fhint:text-[11.5px] fhint:font-bold fhint:text-[#D8521F]">
      <ZapIcon aria-hidden="true" className="fhint:size-3" />
      {__("Sent by auto-reply", "foundhint-local-seo")}
    </span>
  );
}

export default AutoLabel;
