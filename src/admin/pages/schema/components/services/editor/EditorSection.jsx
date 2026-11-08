import Hint from "@/components/Hint";
import { useId } from "react";
import { cn } from "cn";
import { panel, panelHeader, panelTitle } from "../../styles";

/**
 * One section of the service editor as a card, built like a Business
 * Profile section: its icon and title (with an optional hint) over the
 * heavy 2px rule, then its fields with the profile's 20px padding.
 */
export function EditorSection({ icon: Icon, title, hint, children }) {
  const id = useId();

  return (
    <section aria-labelledby={id} className={cn(panel, "fhint:min-w-0")}>
      <div className={panelHeader}>
        {Icon ? (
          <span
            aria-hidden="true"
            className="fhint:grid fhint:size-5.5 fhint:flex-none fhint:place-items-center fhint:text-muted-strong"
          >
            <Icon className="fhint:size-4" />
          </span>
        ) : null}
        <h3 id={id} className={panelTitle}>
          {title}
        </h3>
        {hint ? <Hint about={title} text={hint} /> : null}
      </div>
      <div className="fhint:grid fhint:gap-4.5 fhint:p-5">{children}</div>
    </section>
  );
}

export default EditorSection;
