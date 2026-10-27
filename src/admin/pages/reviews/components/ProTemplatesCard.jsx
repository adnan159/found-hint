import { __, sprintf } from "@wordpress/i18n";
import { BadgeCheckIcon } from "lucide-react";
import RequestError from "@/components/RequestError";
import SectionCard from "@/components/SectionCard";
import { useGetProStatusQuery } from "@/store/api/proApi";

/**
 * Reply templates with FoundHint Pro active — shown in place of the
 * TemplatesCard upsell.
 *
 * Placeholder: it proves the Pro wiring end to end (the bootstrap flag and
 * a Pro REST route) and is where the real template manager goes.
 */
export function ProTemplatesCard() {
  const { data, error } = useGetProStatusQuery();

  return (
    <SectionCard title={__("Reply templates", "foundhint-local-seo")}>
      <RequestError error={error} />
      <p className="fhint:m-0 fhint:flex fhint:items-center fhint:gap-2 fhint:text-[13px]">
        <BadgeCheckIcon
          aria-hidden="true"
          className="fhint:size-4 fhint:text-primary"
        />
        {data
          ? sprintf(
              /* translators: %s: the FoundHint Pro version. */
              __("FoundHint Pro %s is active.", "foundhint-local-seo"),
              data.version,
            )
          : __("Loading FoundHint Pro…", "foundhint-local-seo")}
      </p>
    </SectionCard>
  );
}

export default ProTemplatesCard;
