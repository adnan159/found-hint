import { useEffect, useRef, useState } from "react";
import { __, sprintf } from "@wordpress/i18n";
import { CheckIcon, CircleAlertIcon } from "lucide-react";
import { cn } from "cn";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { errorMessage, fieldErrors } from "@/lib/errors";
import {
  usePlanPublishMutation,
  useRunPublishStepMutation,
} from "@/store/api/profileApi";
import {
  errorText,
  help,
  primaryButton,
  quietButton,
  tag,
  tagTones,
} from "../styles";

const STEP_TITLES = {
  location: () => __("Business details", "foundhint-local-seo"),
  attributes: () => __("Links and attributes", "foundhint-local-seo"),
};

const FIELD_NAMES = {
  name: () => __("Business name", "foundhint-local-seo"),
  description: () => __("Description", "foundhint-local-seo"),
  website: () => __("Website", "foundhint-local-seo"),
  phone: () => __("Phone number", "foundhint-local-seo"),
  categories: () => __("Categories", "foundhint-local-seo"),
  hours: () => __("Business hours", "foundhint-local-seo"),
  special_hours: () => __("Special hours", "foundhint-local-seo"),
  services: () => __("Services", "foundhint-local-seo"),
};

function fieldName(field) {
  if (FIELD_NAMES[field]) {
    return FIELD_NAMES[field]();
  }

  const [kind, id] = String(field).split(".");

  if (kind === "social" && id) {
    return sprintf(
      /* translators: %s: a social network, such as facebook. */
      __("%s link", "foundhint-local-seo"),
      id.charAt(0).toUpperCase() + id.slice(1),
    );
  }

  return id ?? field;
}

const SKIP_REASONS = {
  empty_here: () =>
    __(
      "Empty here, so Google keeps what it has. FoundHint never clears a field on Google.",
      "foundhint-local-seo",
    ),
  no_google_id: () =>
    __(
      "Typed by hand. Choose the category from Google's list to send it.",
      "foundhint-local-seo",
    ),
  not_allowed: () =>
    __("Google does not let this listing change it.", "foundhint-local-seo"),
  not_on_google: () =>
    __(
      "Google has no place for it. It stays in your website markup.",
      "foundhint-local-seo",
    ),
};

/**
 * Send the saved profile to Google, one request at a time.
 *
 * Opening the dialog only *checks*: it asks what would be sent and sends
 * nothing. Sending is a second, explicit press, and each step reports as its
 * own request comes back — so a refusal on the second step is shown against
 * that step, with the first already known to have landed.
 */
export function PublishDialog({ locationId = 0, onClose, onSent }) {
  const [plan, planState] = usePlanPublishMutation();
  const [runStep] = useRunPublishStepMutation();
  // step id -> "sending" | "done" | "failed"
  const [progress, setProgress] = useState({});
  const [failure, setFailure] = useState(null);
  const [running, setRunning] = useState(false);
  const asked = useRef(false);

  useEffect(() => {
    // Once per opening: a plan costs two reads of Google's quota.
    if (!asked.current) {
      asked.current = true;
      plan({ locationId });
    }
  }, [plan, locationId]);

  const steps = planState.data?.plan?.steps ?? [];
  const skipped = planState.data?.plan?.skipped ?? [];
  const listing = planState.data?.listing;
  const finished =
    steps.length > 0 && steps.every((step) => progress[step.id] === "done");

  const send = async () => {
    setRunning(true);
    setFailure(null);

    // In order and one at a time: Google refuses edits fired together.
    for (const step of steps) {
      if (progress[step.id] === "done") {
        continue;
      }

      setProgress((current) => ({ ...current, [step.id]: "sending" }));

      try {
        await runStep({
          step: step.id,
          token: step.token,
          locationId,
        }).unwrap();
        setProgress((current) => ({ ...current, [step.id]: "done" }));
      } catch (error) {
        setProgress((current) => ({ ...current, [step.id]: "failed" }));
        setFailure({ step: step.id, error });
        setRunning(false);
        onSent();

        return;
      }
    }

    setRunning(false);
    onSent();
  };

  const checkAgain = () => {
    setProgress({});
    setFailure(null);
    plan({ locationId });
  };

  const stale = failure?.error?.data?.code === "fhint_publish_stale";

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
              {steps.map((step, index) => {
                const state = progress[step.id];
                const refused =
                  failure?.step === step.id ? fieldErrors(failure.error) : {};

                return (
                  <li
                    key={step.id}
                    className="fhint:m-0 fhint:grid fhint:gap-2 fhint:border fhint:border-border fhint:px-3.5 fhint:py-3"
                  >
                    <span className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2">
                      <strong className="fhint:text-[13.5px]">
                        {sprintf(
                          /* translators: 1: step number, 2: what the step sends. */
                          __("Step %1$d: %2$s", "foundhint-local-seo"),
                          index + 1,
                          STEP_TITLES[step.id]?.() ?? step.id,
                        )}
                      </strong>
                      <span
                        className={cn(
                          tag,
                          "fhint:ml-auto fhint:inline-flex fhint:items-center fhint:gap-1",
                          state === "done"
                            ? tagTones.ok
                            : state === "failed"
                              ? tagTones.bad
                              : tagTones.quiet,
                        )}
                      >
                        {state === "sending" ? <Spinner /> : null}
                        {state === "done" ? (
                          <CheckIcon
                            aria-hidden="true"
                            className="fhint:size-3"
                          />
                        ) : null}
                        {state === "failed" ? (
                          <CircleAlertIcon
                            aria-hidden="true"
                            className="fhint:size-3"
                          />
                        ) : null}
                        {state === "sending"
                          ? __("Sending…", "foundhint-local-seo")
                          : state === "done"
                            ? __("Sent", "foundhint-local-seo")
                            : state === "failed"
                              ? __("Not sent", "foundhint-local-seo")
                              : __("Waiting", "foundhint-local-seo")}
                      </span>
                    </span>
                    <ul className="fhint:m-0 fhint:grid fhint:list-none fhint:gap-1 fhint:p-0 fhint:text-[12.5px] fhint:text-foreground-soft">
                      {step.fields.map((change) => (
                        <li key={change.field} className="fhint:m-0">
                          {fieldName(change.field)}
                          {refused[change.field] ? (
                            <span className={cn(errorText, "fhint:block")}>
                              {refused[change.field]}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                    {failure?.step === step.id ? (
                      <span role="alert" className={errorText}>
                        {refused[step.id] ?? errorMessage(failure.error)}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          ) : null}

          {planState.isSuccess && skipped.length ? (
            <div className="fhint:grid fhint:gap-1.5">
              <strong className="fhint:text-[13px]">
                {__("Not being sent", "foundhint-local-seo")}
              </strong>
              <ul className="fhint:m-0 fhint:grid fhint:list-none fhint:gap-1 fhint:p-0">
                {skipped.map((item) => (
                  <li key={item.field} className={cn(help, "fhint:m-0")}>
                    <strong className="fhint:text-foreground-soft">
                      {fieldName(item.field)}:
                    </strong>{" "}
                    {SKIP_REASONS[item.reason]?.() ?? item.reason}
                  </li>
                ))}
              </ul>
            </div>
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
