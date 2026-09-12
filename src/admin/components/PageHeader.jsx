import { useEffect, useRef } from "react";
import { __ } from "@wordpress/i18n";

/**
 * The heading block at the top of every screen.
 *
 * Type is measured from the prototype: a small uppercase breadcrumb over a
 * 21px/800 title with slightly negative tracking.
 *
 * Focus moves to the heading whenever the title changes. In a hash-routed
 * SPA the browser does not move focus on navigation the way a real page
 * load does, so without this a keyboard or screen-reader user stays parked
 * on the link they just activated and never hears which screen they landed
 * on.
 */
export function PageHeader({ title, description, actions }) {
  const headingRef = useRef(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [title]);

  return (
    <div className="fhint:flex fhint:flex-wrap fhint:items-start fhint:justify-between fhint:gap-4 fhint:border-b fhint:border-b-border fhint:pb-4">
      <div className="fhint:flex fhint:flex-col fhint:gap-1">
        <span className="fhint:text-[11px] fhint:font-extrabold fhint:tracking-[0.14em] fhint:text-muted-foreground fhint:uppercase">
          {__("FoundHint", "found-hint")}
        </span>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="fhint:font-heading fhint:text-[21px] fhint:font-extrabold fhint:tracking-[-0.02em] fhint:outline-none"
        >
          {title}
        </h1>
        {description ? (
          <p className="fhint:max-w-[76ch] fhint:text-[13.5px] fhint:text-muted-strong">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export default PageHeader;
