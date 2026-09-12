import { sprintf, _n } from "@wordpress/i18n";
import { Outlet } from "react-router";
import { Toaster } from "@/components/ui/sonner";
import { useGetBusinessQuery } from "@/store/api/businessApi";
import { useGetLocationsQuery } from "@/store/api/locationsApi";
import { useGetServicesQuery } from "@/store/api/servicesApi";
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
      _n("%d business", "%d businesses", businesses, "found-hint"),
      businesses,
    ),
    sprintf(
      /* translators: %d: number of locations. */
      _n("%d location", "%d locations", locations, "found-hint"),
      locations,
    ),
    sprintf(
      /* translators: %d: number of services. */
      _n("%d service", "%d services", services, "found-hint"),
      services,
    ),
  ].join(" · ");

  return (
    <div className="fhint:flex fhint:min-h-[calc(100vh-32px)] fhint:bg-background fhint:font-sans fhint:text-foreground">
      <Sidebar counts={counts} />
      <main className="fhint:min-w-0 fhint:flex-1 fhint:p-6">
        <div className="fhint:mx-auto fhint:flex fhint:max-w-5xl fhint:flex-col fhint:gap-6">
          <Outlet />
        </div>
      </main>
      <Toaster position="bottom-right" richColors />
    </div>
  );
};

export default RootLayout;
