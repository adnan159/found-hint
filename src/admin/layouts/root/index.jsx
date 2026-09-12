import { Outlet } from "react-router";
import { Toaster } from "@/components/ui/sonner";
import Sidebar from "./components/Sidebar";

export const RootLayout = () => {
  return (
    <div className="fhint:flex fhint:font-sans">
      <Sidebar />
      <main className="fhint:flex-1 fhint:p-6">
        <Outlet />
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
};

export default RootLayout;
