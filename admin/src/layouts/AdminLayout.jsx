import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";

const AdminLayout = () => {
  const [open, setOpen] = useState(true);
  const [sidebarDarkMode, setSidebarDarkMode] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    // Check if user is in demo mode
    const demoMode = localStorage.getItem("demoMode") === "true";
    setIsDemoMode(demoMode);
  }, []);

  // Theme object for consistent styling (always light mode for main content)
  const theme = {
    text: {
      primary: "#333333",
      secondary: "#666666",
    },
    bg: {
      primary: "#FFFFFF",
      secondary: "#F5F5F5",
      accent: "#EAEAEA",
    },
    border: "#E0E0E0",
  };

  return (
    <div className="min-h-screen bg-[#1E1E1E] text-white">
      {/* Demo Banner */}
      {isDemoMode && (
        <div className="bg-yellow-600 text-white text-center py-2 px-4 fixed top-0 left-0 right-0 z-50">
          <div className="flex items-center justify-center gap-2">
            <span className="font-bold">DEMO MODE</span>
            <span className="hidden sm:inline">
              You have read-only access. Changes will not be saved.
            </span>
          </div>
        </div>
      )}

      {/* Add margin top to account for demo banner */}
      <div className={isDemoMode ? "pt-10" : ""}>
        <div className="flex min-h-screen bg-gray-50">
          {/* Sidebar - only component that uses dark mode */}
          <Sidebar
            open={open}
            setOpen={setOpen}
            darkMode={sidebarDarkMode}
            setDarkMode={setSidebarDarkMode}
          />

          <div className="flex-1 flex flex-col">
            <Navbar open={open} setOpen={setOpen} theme={theme} />

            <main className="flex-1 p-4 md:p-6 bg-gray-50 overflow-auto">
              <Outlet context={{ theme }} />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
