import { createHashRouter } from "react-router";
import RootLayout from "./layouts/root";
import Audit from "./pages/audit";
import Business from "./pages/business";
import Dashboard from "./pages/dashboard";
import Gbp from "./pages/gbp";
import Locations from "./pages/locations";
import NotFound from "./pages/not-found";
import Schema from "./pages/schema";
import Services from "./pages/services";
import Settings from "./pages/settings";

/**
 * Client-side hash routing under one WP admin page (see
 * includes/Presentation/Admin/Menu.php). Keep this list in sync with the
 * submenu entries registered there and with docs/NAVIGATION.md.
 */
export const router = createHashRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "business", element: <Business /> },
      { path: "locations", element: <Locations /> },
      { path: "services", element: <Services /> },
      { path: "schema", element: <Schema /> },
      { path: "audit", element: <Audit /> },
      { path: "gbp", element: <Gbp /> },
      { path: "settings", element: <Settings /> },
    ],
  },
]);
