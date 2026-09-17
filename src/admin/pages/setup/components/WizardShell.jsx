import { useEffect, useRef } from "react";
import { __, sprintf } from "@wordpress/i18n";
import { cn } from "cn";
import logoUrl from "@/assets/foundhint-icon.png";

/**
 * The frame every setup step renders inside.
 *
 * Chrome is measured from the prototype: a sticky white bar over a 2px
 * rule, a step strip beneath it, and a 960px column.
 *
 * Focus moves to the step heading on every step change — not to the page
 * title. The page has not changed, the step has, so that is what someone
 * using a screen reader needs to hear.
 */
export function WizardShell({
  stepId,
  stepNumber,
  totalSteps,
  steps,
  title,
  intro,
  onDismiss,
  children,
}) {
  const headingRef = useRef(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [stepId]);

  return (
    <div className="fhint:-m-6 fhint:flex fhint:min-h-[calc(100vh-32px)] fhint:flex-col fhint:bg-background">
      <div className="fhint:sticky fhint:top-8 fhint:z-2 fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-3 fhint:border-b-2 fhint:border-b-divider fhint:bg-card fhint:px-6 fhint:py-3">
        <img
          src={logoUrl}
          alt=""
          aria-hidden="true"
          width={24}
          height={24}
          className="fhint:size-6 fhint:shrink-0"
        />
        <strong className="fhint:text-[14px] fhint:font-extrabold fhint:tracking-tight">
          {__("FoundHint", "found-hint")}
        </strong>
        <span className="fhint:text-[11px] fhint:font-bold fhint:tracking-[0.12em] fhint:text-muted-foreground fhint:uppercase">
          {__("Setup", "found-hint")}
        </span>

        <span className="fhint:ml-auto fhint:text-[12.5px] fhint:text-muted-strong">
          {sprintf(
            /* translators: 1: current step number, 2: total steps. */
            __("Step %1$d of %2$d", "found-hint"),
            stepNumber,
            totalSteps,
          )}
        </span>
        <button
          type="button"
          onClick={onDismiss}
          className="fhint:cursor-pointer fhint:bg-transparent fhint:text-[12.5px] fhint:font-bold fhint:underline"
        >
          {__("I'll do this later", "found-hint")}
        </button>
      </div>

      <ol className="fhint:flex fhint:flex-wrap fhint:gap-x-5 fhint:gap-y-1 fhint:border-b fhint:border-b-border fhint:bg-card fhint:px-6 fhint:py-2.5">
        {steps.map((step) => (
          <li
            key={step.id}
            aria-current={step.id === stepId ? "step" : undefined}
            className={cn(
              "fhint:flex fhint:items-center fhint:gap-1.5 fhint:text-[11.5px] fhint:font-bold",
              step.id === stepId
                ? "fhint:text-foreground"
                : "fhint:text-muted-foreground",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "fhint:flex fhint:size-[17px] fhint:items-center fhint:justify-center fhint:text-[10px] fhint:font-extrabold",
                step.done
                  ? "fhint:bg-success fhint:text-success-foreground"
                  : step.id === stepId
                    ? "fhint:bg-primary fhint:text-primary-foreground"
                    : "fhint:bg-muted fhint:text-muted-foreground fhint:ring-1 fhint:ring-border",
              )}
            >
              {step.done ? "✓" : step.position}
            </span>
            {step.label}
          </li>
        ))}
      </ol>

      <div className="fhint:mx-auto fhint:w-full fhint:max-w-[960px] fhint:px-6 fhint:pt-8 fhint:pb-16">
        <div className="fhint:border fhint:border-border fhint:bg-card">
          <div className="fhint:border-b-2 fhint:border-b-divider fhint:px-8 fhint:py-8">
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="fhint:font-heading fhint:max-w-[24ch] fhint:text-[30px] fhint:leading-[1.08] fhint:font-extrabold fhint:tracking-[-0.02em] fhint:outline-none"
            >
              {title}
            </h1>
            {intro ? (
              <p className="fhint:mt-2 fhint:max-w-[62ch] fhint:text-[15px] fhint:text-muted-strong">
                {intro}
              </p>
            ) : null}
          </div>
          <div className="fhint:px-8 fhint:py-7">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default WizardShell;
