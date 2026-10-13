import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGetBusinessQuery } from "@/store/api/businessApi";
import { useGetLocationsQuery } from "@/store/api/locationsApi";
import { useGetServicesQuery } from "@/store/api/servicesApi";
import { _n, sprintf } from "@wordpress/i18n";
import { Outlet } from "react-router";
import Sidebar from "./components/Sidebar";

/**
 * The shell every screen renders inside.
 *
 * The plan line in the sidebar footer is read from the same endpoints the
 * screens use, so it cannot disagree with them — RTK Query dedupes the
 * requests, and a save anywhere invalidates the tags that feed it.
 */
export const RootLayout = () => {
  const { data: businessData } = useGetBusinessQuery();
  const { data: locationsData } = useGetLocationsQuery();
  const { data: servicesData } = useGetServicesQuery();

  const businesses = businessData?.exists ? 1 : 0;
  const locations = locationsData?.total ?? 0;
  const services = servicesData?.total ?? 0;

  const counts = [
    sprintf(
      /* translators: %d: number of business profiles, always 0 or 1. */
      _n("%d business", "%d businesses", businesses, "foundhint-local-seo"),
      businesses,
    ),
    sprintf(
      /* translators: %d: number of locations. */
      _n("%d location", "%d locations", locations, "foundhint-local-seo"),
      locations,
    ),
    sprintf(
      /* translators: %d: number of services. */
      _n("%d service", "%d services", services, "foundhint-local-seo"),
      services,
    ),
  ].join(" · ");

  return (
    // One tooltip provider for the whole shell: the delay is a property of
    // the app, not of each hint, and Base UI only reads it here.
    <TooltipProvider delay={100}>
      <div className="fhint:flex fhint:min-h-[calc(100vh-32px)] fhint:border-t fhint:border-t-border fhint:bg-background fhint:font-sans fhint:text-foreground">
        <Sidebar counts={counts} />
        <main className="fhint:min-w-0 fhint:flex-1 fhint:px-4 fhint:py-6">
          <div className="fhint:mx-auto fhint:flex fhint:flex-col fhint:gap-6">
            <Outlet />
          </div>
        </main>
        <Toaster position="bottom-right" richColors />
      </div>
    </TooltipProvider>
  );
};

export default RootLayout;
