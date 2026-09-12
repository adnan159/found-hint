import { __ } from "@wordpress/i18n";

/**
 * Placeholder. Real layout: Local SEO Health Score, Setup Progress, GBP
 * connect card, "Fix First" issue, Locations table, Quick Actions, Recent
 * Activity — see project memory (FoundHint UI prototype) and
 * docs/NAVIGATION.md for the full card-by-card spec.
 */
const Dashboard = () => {
  return (
    <div className="fhint:space-y-2">
      <h1 className="fhint:text-xl fhint:font-semibold">
        {__("Dashboard", "found-hint")}
      </h1>
      <p className="fhint:text-muted-foreground fhint:text-sm">
        {__(
          "Scaffold page — content lands as each module is built.",
          "found-hint",
        )}
      </p>
    </div>
  );
};

export default Dashboard;
