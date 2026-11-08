import { __ } from "@wordpress/i18n";
import { toast } from "sonner";
import { help } from "@/pages/profile/styles";
import ReviewsDialog from "@/pages/reviews/components/ReviewsDialog";
import { dialogButton, primaryAction } from "@/pages/reviews/styles";
import { cronLine } from "@/lib/cron";

const code =
  "fhint:block fhint:overflow-x-auto fhint:border fhint:border-border fhint:bg-muted fhint:px-3 fhint:py-2 fhint:font-mono fhint:text-[12.5px] fhint:whitespace-pre";
const step = "fhint:grid fhint:gap-1.5";

/**
 * "Make background tasks run on time": a cron job at the host, or a free
 * online service, opening this site's wp-cron.php every five minutes.
 *
 * @param {Object}   props
 * @param {Object}   props.state   From `cronJob()`: `{ disabled, cronUrl }`.
 * @param {Function} props.onClose Close.
 */
export function CronGuide({ state, onClose }) {
  const line = cronLine(state.cronUrl);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(line);
      toast.success(__("Cron line copied.", "foundhint-local-seo"));
    } catch {
      toast.error(
        __("Could not copy. Select the text instead.", "foundhint-local-seo"),
      );
    }
  };

  return (
    <ReviewsDialog
      title={__("Make background tasks run on time", "foundhint-local-seo")}
      description={__(
        "How to set up a cron job for FoundHint.",
        "foundhint-local-seo",
      )}
      onClose={onClose}
      note={__(
        "This warning goes away once the tasks run on time.",
        "foundhint-local-seo",
      )}
      footer={
        <>
          <button type="button" onClick={onClose} className={dialogButton}>
            {__("Close", "foundhint-local-seo")}
          </button>
          <button type="button" onClick={copy} className={primaryAction}>
            {__("Copy cron line", "foundhint-local-seo")}
          </button>
        </>
      }
    >
      <p className={help}>
        {state.disabled
          ? __(
              "WordPress's own task runner is switched off on this site (DISABLE_WP_CRON), so nothing runs until a cron job calls it.",
              "foundhint-local-seo",
            )
          : __(
              "Auto-reply and scheduled posts run in the background. WordPress starts them only when someone opens a page, so on a quiet site, behind a page cache, or where the host blocks it, they wait.",
              "foundhint-local-seo",
            )}
      </p>

      <div className={step}>
        <strong>
          {__("1. Add a cron job at your host (best)", "foundhint-local-seo")}
        </strong>
        <span className={help}>
          {__(
            "In your hosting control panel, open Cron Jobs (cPanel) or Scheduled Tasks (Plesk), and add this to run every 5 minutes:",
            "foundhint-local-seo",
          )}
        </span>
        <code className={code}>{line}</code>
      </div>

      <div className={step}>
        <strong>
          {__("2. Or use a free online cron service", "foundhint-local-seo")}
        </strong>
        <span className={help}>
          {__(
            "No access to cron at your host? A service such as cron-job.org can open this address every 5 minutes:",
            "foundhint-local-seo",
          )}
        </span>
        <code className={code}>{state.cronUrl}</code>
      </div>

      <div className={step}>
        <strong>
          {__(
            "3. Optional: stop visits from running tasks",
            "foundhint-local-seo",
          )}
        </strong>
        <span className={help}>
          {__(
            "Once the cron job works, your developer can add this line to wp-config.php so visits no longer start tasks:",
            "foundhint-local-seo",
          )}
        </span>
        <code className={code}>{"define( 'DISABLE_WP_CRON', true );"}</code>
      </div>
    </ReviewsDialog>
  );
}

export default CronGuide;
