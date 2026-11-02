import { __ } from "@wordpress/i18n";
import ScreenTitleBar, { SyncButton } from "@/components/ScreenTitleBar";

/**
 * The Reviews title row: the shared screen title bar, with the button that
 * reads reviews from Google on the right.
 *
 * `onSync` is absent until a Google listing is chosen for the location, and
 * the button is left out until then.
 */
export function ReviewsHeader({ ready, onSync, syncing }) {
  return (
    <ScreenTitleBar
      title={__("Reviews", "foundhint-local-seo")}
      hint={__(
        "What customers say about this location on Google. Read, filter and reply to reviews in one place. Only syncing and replying contact Google.",
        "foundhint-local-seo",
      )}
      ready={ready}
      actions={
        onSync ? (
          <SyncButton
            onClick={onSync}
            syncing={syncing}
            label={__("Sync reviews", "foundhint-local-seo")}
            busyLabel={__("Syncing…", "foundhint-local-seo")}
            title={__(
              "Reads the latest reviews from Google. Nothing on Google is changed.",
              "foundhint-local-seo",
            )}
          />
        ) : null
      }
    />
  );
}

export default ReviewsHeader;
