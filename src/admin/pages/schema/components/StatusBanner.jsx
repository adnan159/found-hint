import { __ } from "@wordpress/i18n";
import { CheckIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import NoticeBar from "@/components/NoticeBar";
import { messageForCode } from "@/lib/errors";

/**
 * Whether the markup is published, and if not, why not.
 *
 * @param {Object} props
 * @param {Object} props.schema The /schema response.
 */
export function StatusBanner({ schema }) {
  const { ownership, isPublishable, blockers } = schema;

  if (!ownership) {
    return null;
  }

  if (!ownership.should_publish) {
    return (
      <NoticeBar>
        {ownership.deferring_to_plugin
          ? __(
              "FoundHint is not publishing this markup, because a plugin known to publish it is active.",
              "foundhint-local-seo",
            )
          : __(
              "FoundHint is not publishing this markup, because of the setting below.",
              "foundhint-local-seo",
            )}
      </NoticeBar>
    );
  }

  if (!isPublishable) {
    return (
      <Alert variant="destructive" role="alert">
        <AlertTitle>
          {__("Nothing is being published", "foundhint-local-seo")}
        </AlertTitle>
        <AlertDescription>
          <ul className="fhint:flex fhint:flex-col fhint:gap-1">
            {blockers.map((code) => (
              <li key={code}>{messageForCode(code)}</li>
            ))}
          </ul>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div
      role="status"
      className="fhint:flex fhint:items-center fhint:gap-2 fhint:border fhint:border-border fhint:bg-card fhint:px-4 fhint:py-3 fhint:text-[13px]"
    >
      <CheckIcon
        aria-hidden="true"
        className="fhint:size-4 fhint:text-success"
      />
      {__("This markup is published on your site.", "foundhint-local-seo")}
    </div>
  );
}

export default StatusBanner;
