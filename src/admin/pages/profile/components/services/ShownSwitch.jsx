import { __ } from "@wordpress/i18n";
import { cn } from "cn";
import { focus } from "../../styles";
import { fieldLabel } from "./styles";

/**
 * Whether the service is shown on Google. Off hides it without deleting it.
 * A real `role="switch"`, named and described by the text beside it.
 */
export function ShownSwitch({ id, shown, onToggle }) {
  return (
    <div className="fhint:flex fhint:items-center fhint:gap-4 fhint:border-t fhint:border-t-border fhint:pt-6">
      <div className="fhint:min-w-0 fhint:flex-1">
        <span id={`${id}-shown`} className={cn(fieldLabel, "fhint:block")}>
          {__("Show on Google", "foundhint-local-seo")}
        </span>
        <span
          id={`${id}-shown-hint`}
          className="fhint:text-[13px] fhint:text-muted-strong"
        >
          {__(
            "Turn this off to hide the service for now without deleting it.",
            "foundhint-local-seo",
          )}
        </span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={shown}
        aria-labelledby={`${id}-shown`}
        aria-describedby={`${id}-shown-hint`}
        onClick={onToggle}
        className={cn(
          "fhint:relative fhint:h-7 fhint:w-[52px] fhint:flex-none fhint:cursor-pointer fhint:rounded-full fhint:border-0 fhint:p-0 fhint:transition-colors",
          shown ? "fhint:bg-primary" : "fhint:bg-input",
          focus,
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "fhint:absolute fhint:top-[3px] fhint:size-[22px] fhint:rounded-full fhint:bg-card fhint:transition-[left]",
            shown ? "fhint:left-[27px]" : "fhint:left-[3px]",
          )}
        />
      </button>
    </div>
  );
}

export default ShownSwitch;
