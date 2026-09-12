import { __ } from "@wordpress/i18n";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

/**
 * The controls at the foot of every collecting step.
 *
 * "Skip this step" is always offered: setup that cannot be got past is a
 * trap, and a step left unfilled is recoverable from the dashboard
 * checklist afterwards.
 */
export function StepActions({ isSaving, onBack, onSkip, submitLabel }) {
  return (
    <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2.5 fhint:border-t fhint:border-t-border fhint:pt-5">
      <Button type="submit" size="lg" disabled={isSaving}>
        {isSaving ? <Spinner data-icon="inline-start" /> : null}
        {submitLabel || __("Save and continue", "found-hint")}
      </Button>

      {onBack ? (
        <Button type="button" size="lg" variant="outline" onClick={onBack}>
          {__("Back", "found-hint")}
        </Button>
      ) : null}

      <Button
        type="button"
        variant="ghost"
        className="fhint:ml-auto"
        onClick={onSkip}
      >
        {__("Skip this step", "found-hint")}
      </Button>
    </div>
  );
}

export default StepActions;
