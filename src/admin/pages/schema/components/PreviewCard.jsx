import { __ } from "@wordpress/i18n";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import SectionCard from "@/components/SectionCard";

/**
 * The JSON-LD this site prints for the chosen location.
 *
 * @param {Object} props
 * @param {string} props.json The graph, pretty-printed.
 */
export function PreviewCard({ json }) {
  return (
    <SectionCard
      id="schema-preview"
      title={__("What gets published", "foundhint-local-seo")}
      description={__(
        "Exactly what appears in your pages' head, read from the same cache the front end uses.",
        "foundhint-local-seo",
      )}
      action={
        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(json);
              toast.success(__("Copied.", "foundhint-local-seo"));
            } catch {
              toast.error(
                __(
                  "Could not copy. Select the text instead.",
                  "foundhint-local-seo",
                ),
              );
            }
          }}
        >
          {__("Copy", "foundhint-local-seo")}
        </Button>
      }
    >
      {/* Rendered as text, never as markup. The one place the plugin
          shows JSON-LD, and it goes through JSON.stringify on data the
          server produced — there is no innerHTML anywhere near it. */}
      <pre className="fhint:max-h-[520px] fhint:overflow-auto fhint:border fhint:border-border fhint:bg-muted fhint:p-4 fhint:text-[12.5px] fhint:leading-relaxed">
        <code>{json}</code>
      </pre>
    </SectionCard>
  );
}

export default PreviewCard;
