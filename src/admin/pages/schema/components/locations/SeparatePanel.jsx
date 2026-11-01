import { __, sprintf } from "@wordpress/i18n";
import { TriangleAlertIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { useGetSeparateSchemaQuery } from "@/store/api/schemaManagerApi";
import JsonPreview from "../shared/JsonPreview";
import { dialogButton, primaryAction } from "../styles";

/**
 * A separate business (design B): its Google profile links to a website of
 * its own, so its schema belongs on that site — FoundHint publishes nothing
 * for it here. Its schema to copy there, or "Treat as a branch anyway".
 *
 * @param {Object}   props
 * @param {Object}   props.row             Its row in the Locations list.
 * @param {Function} props.onTreatAsBranch Make it a branch.
 */
export function SeparatePanel({ row, onTreatAsBranch }) {
  const { data: document, isLoading } = useGetSeparateSchemaQuery(row.id);
  const here = window.location.hostname;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        `<script type="application/ld+json">\n${JSON.stringify(document, null, 2)}\n</script>`,
      );
      toast.success(__("Schema copied.", "foundhint-local-seo"));
    } catch {
      toast.error(
        __("Could not copy. Select the text instead.", "foundhint-local-seo"),
      );
    }
  };

  return (
    <div className="fhint:grid fhint:min-w-0 fhint:gap-4">
      <div
        role="alert"
        className="fhint:flex fhint:flex-wrap fhint:items-start fhint:gap-3 fhint:border fhint:border-warning-foreground/30 fhint:bg-warning-tint fhint:px-5 fhint:py-4"
      >
        <TriangleAlertIcon
          aria-hidden="true"
          className="fhint:mt-0.5 fhint:size-5 fhint:text-warning-foreground"
        />
        <span className="fhint:grid fhint:min-w-0 fhint:flex-[1_1_320px] fhint:gap-1 fhint:text-[13.5px]">
          <strong>
            {sprintf(
              /* translators: %s: a website domain. */
              __(
                "This profile's website is %s. Its schema should be published on that site.",
                "foundhint-local-seo",
              ),
              row.domain,
            )}
          </strong>
          <span>
            {sprintf(
              /* translators: 1: this site, 2: the profile, 3: its domain. */
              __(
                "FoundHint only adds schema to %1$s, so nothing for %2$s is published here. Copy its schema to %3$s, or install FoundHint on that site.",
                "foundhint-local-seo",
              ),
              here,
              row.name,
              row.domain,
            )}
          </span>
        </span>
        <span className="fhint:flex fhint:flex-wrap fhint:gap-2">
          <button
            type="button"
            onClick={copy}
            disabled={!document}
            className={cn(primaryAction, "fhint:disabled:opacity-50")}
          >
            {__("Copy its schema", "foundhint-local-seo")}
          </button>
          <button
            type="button"
            onClick={onTreatAsBranch}
            className={dialogButton}
          >
            {__("Treat as a branch anyway", "foundhint-local-seo")}
          </button>
        </span>
      </div>

      <JsonPreview
        document={document}
        rootType={document?.["@type"] ?? ""}
        live={false}
        loading={isLoading}
        dirty={false}
      />
    </div>
  );
}

export default SeparatePanel;
