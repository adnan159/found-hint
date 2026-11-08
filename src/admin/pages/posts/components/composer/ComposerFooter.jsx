import { __ } from "@wordpress/i18n";
import { CalendarClockIcon, SendIcon } from "lucide-react";
import { dialogButton, primaryAction } from "../../styles";
import { footerNote, primaryLabel } from "../../lib/composer";

/** What pressing the main button does, Cancel, and the button itself. */
export function ComposerFooter({ formId, when, onGoogle, saving, onCancel }) {
  const Icon = when === "schedule" && !onGoogle ? CalendarClockIcon : SendIcon;

  return (
    <div className="fhint:flex fhint:flex-none fhint:flex-wrap fhint:items-center fhint:gap-3 fhint:border-t fhint:border-t-border fhint:px-5 fhint:py-3.5">
      <span className="fhint:min-w-0 fhint:flex-1 fhint:text-sm fhint:text-muted-strong">
        {footerNote({ onGoogle, when })}
      </span>
      <div className="fhint:flex fhint:gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className={dialogButton}
        >
          {__("Cancel", "foundhint-local-seo")}
        </button>
        <button
          type="submit"
          form={formId}
          disabled={saving}
          className={primaryAction}
        >
          <Icon aria-hidden="true" className="fhint:size-3.5" />
          {primaryLabel({ saving, onGoogle, when })}
        </button>
      </div>
    </div>
  );
}

export default ComposerFooter;
