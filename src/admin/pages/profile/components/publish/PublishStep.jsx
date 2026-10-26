import { __, sprintf } from "@wordpress/i18n";
import { CheckIcon, CircleAlertIcon } from "lucide-react";
import { cn } from "cn";
import { Spinner } from "@/components/ui/spinner";
import { errorMessage, fieldErrors } from "@/lib/errors";
import { errorText, tag, tagTones } from "../../styles";
import { STEP_TITLES, fieldName } from "./labels";

/**
 * One request to Google: what it sends, and where it stands.
 *
 * @param {Object}  props
 * @param {Object}  props.step    The step, from the plan.
 * @param {number}  props.index   Its place in the plan, from 0.
 * @param {?string} props.state   "sending", "done", "failed", or nothing yet.
 * @param {?Object} props.failure What went wrong, if a step failed.
 */
export function PublishStep({ step, index, state, failure }) {
  const refused = failure?.step === step.id ? fieldErrors(failure.error) : {};

  return (
    <li className="fhint:m-0 fhint:grid fhint:gap-2 fhint:border fhint:border-border fhint:px-3.5 fhint:py-3">
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
            <CheckIcon aria-hidden="true" className="fhint:size-3" />
          ) : null}
          {state === "failed" ? (
            <CircleAlertIcon aria-hidden="true" className="fhint:size-3" />
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
}

export default PublishStep;
