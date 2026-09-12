import { __ } from "@wordpress/i18n";
import { NavLink } from "react-router";
import { cn } from "cn";

/**
 * Primary navigation.
 *
 * Styling is measured from the prototype rather than approximated: a white
 * panel, uppercase 12.5px/800 rows separated by hairlines, and an active
 * row in the peach/rust pair (#fff1eb on #8a3b12) with a 3px accent bar on
 * the leading edge.
 *
 * It lists only screens backed by an endpoint. The prototype also shows
 * Schema, SEO Audit, Google Business Profile, Ranking Grid, Landing Pages
 * and Recommendations; those have no engine yet, and a menu item opening an
 * empty screen reads as a broken feature rather than an absent one.
 */
const NAV_ITEMS = [
  { to: "/", label: __("Dashboard", "found-hint"), end: true },
  { to: "/setup", label: __("Setup", "found-hint") },
  { to: "/business", label: __("Business", "found-hint") },
  { to: "/locations", label: __("Locations", "found-hint") },
  { to: "/services", label: __("Services", "found-hint") },
  { to: "/settings", label: __("Settings", "found-hint") },
];

export function Sidebar({ counts }) {
  return (
    <nav
      aria-label={__("FoundHint", "found-hint")}
      className="fhint:flex fhint:w-[234px] fhint:shrink-0 fhint:flex-col fhint:self-stretch fhint:bg-sidebar fhint:text-sidebar-foreground"
    >
      <div className="fhint:flex fhint:items-center fhint:gap-2.5 fhint:border-b fhint:border-b-sidebar-border fhint:px-4 fhint:py-4">
        <span
          aria-hidden="true"
          className="fhint:flex fhint:size-7 fhint:shrink-0 fhint:items-center fhint:justify-center fhint:rounded-full fhint:bg-primary fhint:text-[13px] fhint:font-extrabold fhint:text-primary-foreground"
        >
          F
        </span>
        <span className="fhint:flex fhint:flex-col fhint:leading-tight">
          <span className="fhint:font-heading fhint:text-[15px] fhint:font-extrabold fhint:tracking-tight">
            {__("FoundHint", "found-hint")}
          </span>
          <span className="fhint:text-[10px] fhint:font-bold fhint:tracking-[0.14em] fhint:text-muted-foreground fhint:uppercase">
            {__("Local SEO", "found-hint")}
          </span>
        </span>
      </div>

      <ul className="fhint:flex fhint:flex-col">
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "fhint:block fhint:border-b fhint:border-b-sidebar-border fhint:border-l-3 fhint:py-[11px] fhint:pr-3.5 fhint:text-[12.5px] fhint:font-extrabold fhint:tracking-[0.02em] fhint:uppercase fhint:no-underline",
                  isActive
                    ? "fhint:border-l-sidebar-primary fhint:bg-sidebar-accent fhint:pl-3.5 fhint:text-sidebar-accent-foreground"
                    : "fhint:border-l-transparent fhint:pl-3.5 fhint:text-sidebar-foreground fhint:hover:bg-muted",
                )
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="fhint:mt-auto fhint:flex fhint:flex-col fhint:gap-1 fhint:border-t fhint:border-t-sidebar-border fhint:px-4 fhint:py-4">
        <span className="fhint:text-[10px] fhint:font-extrabold fhint:tracking-[0.14em] fhint:text-muted-foreground fhint:uppercase">
          {__("FoundHint Free", "found-hint")}
        </span>
        <span className="fhint:text-[11.5px] fhint:text-muted-foreground">
          {counts}
        </span>
      </div>
    </nav>
  );
}

export default Sidebar;
