import { __, sprintf } from "@wordpress/i18n";
import { cn } from "cn";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { errorMessage } from "@/lib/errors";
import { errorText, primaryButton, quietButton } from "../styles";
import PublishStep from "./publish/PublishStep";
import SkippedList from "./publish/SkippedList";
import usePublish from "./publish/usePublish";

/**
 * Send the saved profile to Google, one request at a time.
 *
 * Opening the dialog only *checks*: it asks what would be sent and sends
 * nothing. Sending is a second, explicit press, and each step reports as its
 * own request comes back — so a refusal on the second step is shown against
 * that step, with the first already known to have landed.
 */
export function PublishDialog({ locationId = 0, onClose, onSent }) {
  const {
    planState,
    steps,
    skipped,
    listing,
    progress,
    failure,
    running,
    finished,
    stale,
    send,
    checkAgain,
  } = usePublish(locationId, onSent);

  return (
    <Dialog open onOpenChange={(open) => (open || running ? null : onClose())}>
      <DialogContent className="fhint:max-h-[calc(100vh-4rem)] fhint:overflow-auto fhint:rounded-none fhint:sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="fhint:text-[17px] fhint:font-extrabold">
            {__("Send to Google", "foundhint-local-seo")}
          </DialogTitle>
          <DialogDescription>
            {listing?.title
              ? sprintf(
                  /* translators: %s: the name of a Google Business Profile listing. */
                  __(
                    "What is saved here, compared with your Google listing “%s”.",
                    "foundhint-local-seo",
                  ),
                  listing.title,
                )
              : __(
                  "What is saved here, compared with your Google listing.",
                  "foundhint-local-seo",
                )}
          </DialogDescription>
        </DialogHeader>

        <div aria-live="polite" className="fhint:grid fhint:gap-4">
          {planState.isLoading || planState.isUninitialized ? (
            <p className="fhint:m-0 fhint:flex fhint:items-center fhint:gap-2 fhint:text-[13px]">
              <Spinner />
              {__("Checking what Google has…", "foundhint-local-seo")}
            </p>
          ) : null}

          {planState.isError ? (
            <p role="alert" className={cn(errorText, "fhint:m-0")}>
              {errorMessage(planState.error)}
            </p>
          ) : null}

          {planState.isSuccess && !steps.length ? (
            <p className="fhint:m-0 fhint:text-[13px] fhint:font-semibold">
              {__(
                "Google already has everything saved here. There is nothing to send.",
                "foundhint-local-seo",
              )}
            </p>
          ) : null}

          {planState.isSuccess && steps.length ? (
            <ol className="fhint:m-0 fhint:grid fhint:list-none fhint:gap-2.5 fhint:p-0">
              {steps.map((step, index) => (
                <PublishStep
                  key={step.id}
                  step={step}
                  index={index}
                  state={progress[step.id]}
                  failure={failure}
                />
              ))}
            </ol>
          ) : null}

          {planState.isSuccess && skipped.length ? (
            <SkippedList skipped={skipped} />
          ) : null}

          {finished ? (
            <p className="fhint:m-0 fhint:text-[13px] fhint:font-bold fhint:text-success">
              {__(
                "Sent to Google. It can take a few minutes to show on your listing.",
                "foundhint-local-seo",
              )}
            </p>
          ) : null}
        </div>

        <div className="fhint:flex fhint:justify-end fhint:gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={running}
            className={quietButton}
          >
            {finished || !steps.length
              ? __("Close", "foundhint-local-seo")
              : __("Cancel", "foundhint-local-seo")}
          </button>
          {stale || planState.isError ? (
            <button
              type="button"
              onClick={checkAgain}
              className={primaryButton}
            >
              {__("Check again", "foundhint-local-seo")}
            </button>
          ) : null}
          {steps.length && !finished && !stale ? (
            <button
              type="button"
              onClick={send}
              disabled={running}
              className={primaryButton}
            >
              {running
                ? __("Sending…", "foundhint-local-seo")
                : failure
                  ? __("Try again", "foundhint-local-seo")
                  : __("Send to Google", "foundhint-local-seo")}
            </button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PublishDialog;
