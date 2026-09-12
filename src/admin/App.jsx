import { RouterProvider } from "react-router";
import { ThemeProvider } from "./components/theme-provider";
import "./index.css";
import { router } from "./routes";

const App = () => {
  return (
    <ThemeProvider defaultTheme="light" storageKey="fhint-ui-theme">
      <RouterProvider router={router} />
    </ThemeProvider>
  );
};

export default App;
