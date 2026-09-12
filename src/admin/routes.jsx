import { createHashRouter } from "react-router";
import RootLayout from "./layouts/root";
import Business from "./pages/business";
import Dashboard from "./pages/dashboard";
import LocationDetail from "./pages/locations/detail";
import Locations from "./pages/locations";
import NotFound from "./pages/not-found";
import Services from "./pages/services";
import Setup from "./pages/setup";
import Settings from "./pages/settings";

/**
 * Client-side hash routing under one WordPress admin page (see
 * includes/Admin/Menu.php). Keep this list in sync with the submenu entries
 * registered there.
 *
 * Only screens with a working endpoint behind them are routed. Schema, the
 * SEO audit and Google Business Profile appear in the prototype but have no
 * engine yet, so they are absent rather than empty.
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
      { path: "locations/:id", element: <LocationDetail /> },
      { path: "services", element: <Services /> },
      { path: "settings", element: <Settings /> },
      { path: "setup", element: <Setup /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
