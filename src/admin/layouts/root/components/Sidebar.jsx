import { __ } from "@wordpress/i18n";
import { NavLink } from "react-router";

/**
 * Placeholder sidebar nav. Mirrors the collapsed IA in
 * docs/NAVIGATION.md — replace with the real shadcn/ui sidebar
 * (see the FoundHint prototype notes in project memory) as pages land.
 */
const NAV_ITEMS = [
  { to: "/", label: __("Dashboard", "found-hint"), end: true },
  { to: "/business", label: __("Business", "found-hint") },
  { to: "/locations", label: __("Locations", "found-hint") },
  { to: "/services", label: __("Services", "found-hint") },
  { to: "/schema", label: __("Schema", "found-hint") },
  { to: "/audit", label: __("SEO Audit", "found-hint") },
  { to: "/gbp", label: __("Google Business Profile", "found-hint") },
  { to: "/settings", label: __("Settings", "found-hint") },
];

const Sidebar = () => {
  return (
    <nav
      aria-label={__("FoundHint", "found-hint")}
      className="fhint:w-56 fhint:shrink-0 fhint:border-r fhint:border-sidebar-border fhint:bg-sidebar fhint:text-sidebar-foreground fhint:min-h-screen fhint:p-3"
    >
      <div className="fhint:px-2 fhint:py-3 fhint:text-sm fhint:font-semibold fhint:tracking-wide">
        {__("FoundHint", "found-hint")}
      </div>
      <ul className="fhint:space-y-1">
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  "fhint:block fhint:rounded-md fhint:px-2 fhint:py-2 fhint:text-sm",
                  isActive
                    ? "fhint:bg-sidebar-accent fhint:text-sidebar-accent-foreground"
                    : "fhint:text-sidebar-foreground/80 hover:fhint:bg-sidebar-accent/60",
                ].join(" ")
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Sidebar;
