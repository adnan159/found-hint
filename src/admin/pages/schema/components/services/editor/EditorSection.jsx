import { useId } from "react";
import Hint from "@/components/Hint";

/** The small grey number before each section's title: 01, 02… */
export const sectionNumber =
  "fhint:font-mono fhint:text-[11px] fhint:text-muted-foreground";

/**
 * One numbered section of the service editor: number, title, an optional
 * hint, then its fields.
 */
export function EditorSection({ number, title, hint, children }) {
  const id = useId();

  return (
    <section
      aria-labelledby={id}
      className="fhint:grid fhint:gap-3 fhint:border-t fhint:border-t-border fhint:px-5 fhint:py-4"
    >
      <div className="fhint:flex fhint:items-center fhint:gap-2">
        <span className={sectionNumber}>{number}</span>
        <h3 id={id} className="fhint:m-0 fhint:text-[14px] fhint:font-bold">
          {title}
        </h3>
        {hint ? <Hint about={title} text={hint} /> : null}
      </div>
      {children}
    </section>
  );
}

export default EditorSection;
