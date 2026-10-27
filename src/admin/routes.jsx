import { Navigate, createHashRouter, useParams } from "react-router";
import RootLayout from "./layouts/root";
import Audit from "./pages/audit";
import Business from "./pages/business";
import Dashboard from "./pages/dashboard";
import Google from "./pages/google";
import Posts from "./pages/posts";
import Reviews from "./pages/reviews";
import Schema from "./pages/schema";
import NotFound from "./pages/not-found";
import Profile from "./pages/profile";
import Setup from "./pages/setup";
import SetupGoogle from "./pages/setup/google";
import Settings from "./pages/settings";

/**
 * Client-side hash routing under one WordPress admin page (see
 * includes/Admin/Menu.php). WordPress has a single FoundHint menu entry and
 * no submenus, so this list and the sidebar in layouts/root are the only
 * places a screen is registered. The index route is what the menu opens.
 *
 * Only screens with a working endpoint behind them are routed. The
 * prototype's Landing Pages, Ranking Grid and Performance screens have no
 * engine yet, so they are absent rather than empty.
 */
/**
 * An old link to one location: that location's profile, on its address tab.
 */
function LocationRedirect() {
  const { id } = useParams();
  const location = Number(id) > 0 ? `&location=${Number(id)}` : "";

  return <Navigate to={`/business?tab=address${location}`} replace />;
}

export const router = createHashRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "audit", element: <Audit /> },
      // The profile is the Business screen. The older form keeps the fields
      // that only the site's own markup uses, one level down.
      { path: "business", element: <Profile /> },
      { path: "business/details", element: <Business /> },
      { path: "google", element: <Google /> },
      // The old Locations and Services screens are tabs of the Business
      // profile now. Their addresses still work, and land on the right tab.
      {
        path: "locations",
        element: <Navigate to="/business?tab=address" replace />,
      },
      { path: "locations/:id", element: <LocationRedirect /> },
      { path: "reviews", element: <Reviews /> },
      { path: "posts", element: <Posts /> },
      { path: "schema", element: <Schema /> },
      {
        path: "services",
        element: <Navigate to="/business?tab=services" replace />,
      },
      { path: "settings", element: <Settings /> },
      { path: "setup", element: <Setup /> },
      // Where a first Google sign-in lands: the guided import.
      { path: "setup/google", element: <SetupGoogle /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
