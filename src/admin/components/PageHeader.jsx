import { useEffect, useRef } from "react";
import { __ } from "@wordpress/i18n";

/**
 * The heading block at the top of every screen.
 *
 * Type is measured from the prototype: a small uppercase breadcrumb over a
 * 21px/800 title with slightly negative tracking.
 *
 * The bar runs edge to edge — it cancels the padding of `main` (16px at the sides, 24px above) — and is
 * exactly as tall as the sidebar's logo block, closed by the same 1px rule,
 * so the two rules meet and read as one line across the whole screen. Keep
 * the height and the rule in step with `Sidebar`.
 *
 * The description sits under the bar rather than in it: its length varies
 * from screen to screen, and inside the bar it would make every screen's bar
 * a different height.
 *
 * Focus moves to the heading whenever the title changes. In a hash-routed
 * SPA the browser does not move focus on navigation the way a real page
 * load does, so without this a keyboard or screen-reader user stays parked
 * on the link they just activated and never hears which screen they landed
 * on.
 *
 * `hidden` keeps the heading — and that focus — for a screen whose design
 * has no title bar, such as Reviews: it is read out, but not drawn.
 */
export function PageHeader({ title, description, actions, hidden = false }) {
  const headingRef = useRef(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [title]);

  if (hidden) {
    return (
      <h1 ref={headingRef} tabIndex={-1} className="fhint:sr-only">
        {title}
      </h1>
    );
  }

  return (
    <>
      <div className="fhint:-mx-4 fhint:-mt-6 fhint:box-border fhint:flex fhint:min-h-[68px] fhint:flex-wrap fhint:items-center fhint:justify-between fhint:gap-x-4 fhint:gap-y-2 fhint:border-b fhint:border-b-divider fhint:px-4 fhint:py-2">
        <div className="fhint:flex fhint:flex-col">
          <span className="fhint:text-[11px] fhint:leading-tight fhint:font-extrabold fhint:tracking-[0.14em] fhint:text-muted-foreground fhint:uppercase">
            {__("FoundHint", "foundhint-local-seo")}
          </span>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="fhint:m-0 fhint:p-0 fhint:font-heading fhint:text-[21px] fhint:leading-tight fhint:font-extrabold fhint:tracking-[-0.02em] fhint:outline-none"
          >
            {title}
          </h1>
        </div>
        {actions ? (
          <div className="fhint:flex fhint:flex-wrap fhint:items-center fhint:gap-2">
            {actions}
          </div>
        ) : null}
      </div>
      {description ? (
        <p className="fhint:m-0 fhint:max-w-[76ch] fhint:text-[13.5px] fhint:text-muted-strong">
          {description}
        </p>
      ) : null}
    </>
  );
}

export default PageHeader;
