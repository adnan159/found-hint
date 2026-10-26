import { cn } from "cn";
import { focus } from "../../styles";

/**
 * The design's square switch. A real `role="switch"` button, so it is
 * announced as on or off and works from the keyboard; the word beside it
 * says the same thing the colour does.
 */
export function OpenSwitch({ on, onToggle, name }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={name}
      onClick={onToggle}
      className={cn(
        "fhint:relative fhint:h-5 fhint:w-[38px] fhint:flex-none fhint:cursor-pointer fhint:border-0 fhint:p-0",
        on ? "fhint:bg-primary" : "fhint:bg-input",
        focus,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "fhint:absolute fhint:top-[3px] fhint:size-3.5 fhint:bg-card fhint:transition-[left]",
          on ? "fhint:left-[21px]" : "fhint:left-[3px]",
        )}
      />
    </button>
  );
}

export default OpenSwitch;
