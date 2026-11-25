import { __ } from "@wordpress/i18n";
import SectionCard from "@/components/SectionCard";
import { messageForCode } from "@/lib/errors";

/**
 * What would make the markup better. Nothing here stops it publishing.
 *
 * @param {Object} props
 * @param {Object} props.schema The /schema response.
 */
export function RecommendationsCard({ schema }) {
  return schema.recommendations?.length ? (
    <SectionCard
      id="schema-improve"
      title={__("What would make this better", "foundhint-local-seo")}
      description={__(
        "None of these stop the markup being published. They just leave less for a search engine to work with.",
        "foundhint-local-seo",
      )}
    >
      <ul className="fhint:flex fhint:flex-col fhint:gap-1.5 fhint:text-[13px]">
        {schema.recommendations.map((code) => (
          <li key={code} className="fhint:text-muted-strong">
            {messageForCode(code)}
          </li>
        ))}
      </ul>
    </SectionCard>
  ) : null;
}

export default RecommendationsCard;
