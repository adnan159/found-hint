import { InfoIcon } from "lucide-react";

/**
 * The small "i" beside a label.
 *
 * What it says is also in the page as text tied to the field, so the hint
 * does not depend on hovering — a tooltip alone would never reach somebody
 * on a keyboard or a touch screen.
 */
export function FieldHint({ id, children }) {
  return (
    <>
      <InfoIcon
        aria-hidden="true"
        title={children}
        className="fhint:size-4 fhint:flex-none fhint:text-muted-foreground"
      />
      <span id={id} className="fhint:sr-only">
        {children}
      </span>
    </>
  );
}

export default FieldHint;
