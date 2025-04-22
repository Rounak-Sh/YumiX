import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";

export default function AdminLayout() {
  const [open, setOpen] = useState(true);
  const [sidebarDarkMode, setSidebarDarkMode] = useState(true);

  // Theme object for consistent styling (always light mode for main content)
  const theme = {
    bg: "bg-gray-50",
    card: "bg-white shadow-sm hover:shadow-md transition-shadow",
    table: "bg-white shadow-sm",
    text: "text-gray-700",
    textSecondary: "text-gray-500",
    border: "border-gray-100",
    hover: "hover:bg-gray-50",
    active: "bg-black text-white",
  };

  return (
    <div className="min-h-screen bg-[#1E1E1E] text-white">
      <div className="flex min-h-screen bg-gray-50">
        {/* Sidebar - only component that uses dark mode */}
        <Sidebar
          open={open}
          isDarkMode={sidebarDarkMode}
          toggleTheme={() => setSidebarDarkMode(!sidebarDarkMode)}
        />

        {/* Main Content - always light mode */}
        <div className={`flex-1 ${theme.bg}`}>
          <div
            className={`${
              open ? "ml-64" : "ml-28"
            } transition-all duration-300`}>
            <Navbar open={open} setOpen={setOpen} theme={theme} />
            <main className="p-8 min-h-screen overflow-auto">
              <Outlet context={{ theme }} />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
