import { __, sprintf } from "@wordpress/i18n";
import { CheckIcon, MinusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const LABELS = {
  business: () => __("Business details", "found-hint"),
  location: () => __("Address", "found-hint"),
  hours: () => __("Opening hours", "found-hint"),
  services: () => __("Services", "found-hint"),
};

/**
 * The closing step.
 *
 * It reports what the site actually holds rather than what the wizard was
 * walked through — a step can be done because it was filled in here, or
 * because the data was already there, and either way it is done.
 */
export function DoneStep({ steps, onFinish, onBack }) {
  const dataSteps = steps.filter((step) => step.is_data_step);
  const outstanding = dataSteps.filter((step) => !step.done);

  return (
    <div className="fhint:flex fhint:flex-col fhint:gap-6">
      <ul className="fhint:flex fhint:flex-col fhint:border fhint:border-border">
        {dataSteps.map((step) => (
          <li
            key={step.id}
            className="fhint:flex fhint:items-center fhint:gap-3 fhint:border-b fhint:border-b-border fhint:px-4 fhint:py-3 fhint:last:border-b-0"
          >
            <span
              aria-hidden="true"
              className={
                step.done
                  ? "fhint:flex fhint:size-[17px] fhint:shrink-0 fhint:items-center fhint:justify-center fhint:bg-success fhint:text-success-foreground"
                  : "fhint:flex fhint:size-[17px] fhint:shrink-0 fhint:items-center fhint:justify-center fhint:bg-muted fhint:text-muted-foreground fhint:ring-1 fhint:ring-border"
              }
            >
              {step.done ? (
                <CheckIcon className="fhint:size-3" />
              ) : (
                <MinusIcon className="fhint:size-3" />
              )}
            </span>
            <span className="fhint:text-[13px] fhint:font-bold">
              {LABELS[step.id] ? LABELS[step.id]() : step.id}
            </span>
            <span className="fhint:ml-auto fhint:text-[12.5px] fhint:text-muted-strong">
              {step.done
                ? __("Done", "found-hint")
                : __("Still to do", "found-hint")}
            </span>
          </li>
        ))}
      </ul>

      <p className="fhint:max-w-[62ch] fhint:text-[13.5px] fhint:text-muted-strong">
        {outstanding.length === 0
          ? __(
              "That is everything. You can change any of it at any time — the dashboard keeps track from here.",
              "found-hint",
            )
          : sprintf(
              /* translators: %d: number of steps not yet completed. */
              __(
                "You can finish the remaining %d from the dashboard whenever you like; nothing here is locked in.",
                "found-hint",
              ),
              outstanding.length,
            )}
      </p>

      <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2.5 fhint:border-t fhint:border-t-border fhint:pt-5">
        <Button size="lg" onClick={onFinish}>
          {__("Go to the dashboard", "found-hint")}
        </Button>
        <Button size="lg" variant="outline" onClick={onBack}>
          {__("Back", "found-hint")}
        </Button>
      </div>
    </div>
  );
}

export default DoneStep;
