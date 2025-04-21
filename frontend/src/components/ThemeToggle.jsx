import React from "react";
import { useTheme } from "../context/ThemeContext";
import { SunIcon, MoonIcon } from "@heroicons/react/24/outline";

const ThemeToggle = () => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center justify-center w-8 h-8 rounded-full bg-[#FFCF50]/20 hover:bg-[#FFCF50]/30 transition-colors duration-200 focus:outline-none"
      aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}>
      {isDarkMode ? (
        <SunIcon className="w-5 h-5 text-[#b3933b]" />
      ) : (
        <MoonIcon className="w-5 h-5 text-[#23486A]" />
      )}
    </button>
  );
};

export default ThemeToggle;
