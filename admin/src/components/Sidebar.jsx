import { useState, useRef, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { yumix } from "@/assets/assets";
import {
  HomeIcon,
  UsersIcon,
  BookOpenIcon,
  CreditCardIcon,
  DocumentChartBarIcon,
  BanknotesIcon,
  SunIcon,
  MoonIcon,
  ChevronDownIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/solid";

const navigation = [
  { name: "Dashboard", path: "/dashboard", icon: HomeIcon },
  {
    name: "Users",
    icon: UsersIcon,
    children: [
      { name: "All Users", path: "/users/all" },
      { name: "Blocked Users", path: "/users/blocked" },
    ],
  },
  {
    name: "Recipes",
    icon: BookOpenIcon,
    children: [
      { name: "Search Recipes", path: "/recipes/search" },
      { name: "Featured Recipes", path: "/recipes/featured" },
    ],
  },
  {
    name: "Subscriptions",
    icon: CreditCardIcon,
    children: [
      { name: "Plans", path: "/subscriptions" },
      { name: "Subscribers", path: "/subscribers" },
    ],
  },
  { name: "Payments", path: "/payments", icon: BanknotesIcon },
  { name: "Reports", path: "/reports", icon: DocumentChartBarIcon },
  { name: "Support", path: "/support", icon: ChatBubbleLeftRightIcon },
];

export default function Sidebar({ open, isDarkMode, toggleTheme }) {
  const [expandedItems, setExpandedItems] = useState({});
  const [hoveredItem, setHoveredItem] = useState(null);
  const hoverTimeoutRef = useRef(null);
  const dropdownRefs = useRef({});

  const toggleExpand = (name) => {
    setExpandedItems((prev) => {
      // If clicking the same item, just toggle it
      if (name in prev) {
        return {
          [name]: !prev[name],
        };
      }
      // If clicking a different item, close others and open this one
      return {
        [name]: true,
      };
    });
  };

  // Close dropdowns when clicking a regular nav item
  const handleNavClick = () => {
    setExpandedItems({});
    setHoveredItem(null);
  };

  // Handle hover for collapsed sidebar
  const handleItemHover = (name) => {
    if (!open) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = setTimeout(() => {
        setHoveredItem(name);
      }, 200);
    }
  };

  const handleItemLeave = () => {
    if (!open) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = setTimeout(() => {
        setHoveredItem(null);
      }, 300);
    }
  };

  // Close hover dropdown when sidebar opens
  useEffect(() => {
    if (open) {
      setHoveredItem(null);
    }
  }, [open]);

  // Handle clicks outside the dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        hoveredItem &&
        dropdownRefs.current[hoveredItem] &&
        !dropdownRefs.current[hoveredItem].contains(event.target)
      ) {
        setHoveredItem(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [hoveredItem]);

  return (
    <aside
      className={`${
        open ? "w-60" : "w-24"
      } fixed inset-y-4 left-4 z-50 flex flex-col ${
        isDarkMode ? "bg-black" : "bg-white"
      } rounded-xl border border-gray-200 transition-all duration-300`}>
      {/* Logo */}
      <div className="flex h-[70px] items-center justify-center px-4 mt-7">
        {open ? (
          <div className="flex items-center justify-center bg-black rounded-lg overflow-hidden p-2 h-[64px] w-auto">
            <img src={yumix} alt="YuMix" className="h-[64px] w-auto" />
          </div>
        ) : (
          <div className="flex items-center justify-center bg-black rounded-lg overflow-hidden h-[40px] w-auto">
            <img src={yumix} alt="YuMix" className="h-[40px] w-auto" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => (
          <div
            key={item.name}
            className="relative"
            onMouseEnter={() => handleItemHover(item.name)}
            onMouseLeave={handleItemLeave}
            ref={(el) => (dropdownRefs.current[item.name] = el)}>
            {item.children ? (
              // Dropdown Item
              <div className="mb-2">
                <button
                  onClick={() => toggleExpand(item.name)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 transition-colors ${
                    isDarkMode
                      ? "text-gray-300 hover:bg-white/10"
                      : "text-gray-700 hover:bg-black/10"
                  }`}>
                  <div
                    className={`flex items-center ${
                      !open ? "justify-center w-full" : "gap-3"
                    }`}>
                    <item.icon className="h-5 w-5" />
                    <span
                      className={`text-sm font-medium transition-opacity duration-300 ${
                        open ? "opacity-100" : "opacity-0 absolute"
                      }`}>
                      {item.name}
                    </span>
                  </div>
                  {open && (
                    <ChevronDownIcon
                      className={`h-4 w-4 transition-transform ${
                        expandedItems[item.name] ? "rotate-180" : ""
                      }`}
                    />
                  )}
                </button>

                {/* Dropdown Menu - For expanded sidebar */}
                {expandedItems[item.name] && open && (
                  <div className="ml-9 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        className={({ isActive }) =>
                          `block rounded-lg px-3 py-2 text-sm transition-colors ${
                            isActive
                              ? isDarkMode
                                ? "bg-white text-black"
                                : "bg-black text-white"
                              : isDarkMode
                              ? "text-gray-300 hover:bg-white/10"
                              : "text-gray-700 hover:bg-black/10"
                          }`
                        }>
                        {child.name}
                      </NavLink>
                    ))}
                  </div>
                )}

                {/* Hover Dropdown - For collapsed sidebar */}
                {!open && hoveredItem === item.name && (
                  <div className="absolute left-full ml-2 top-0 w-48 rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
                    {/* Always black header */}
                    <div className="px-3 py-2 font-medium bg-black text-white border-b border-gray-700">
                      {item.name}
                    </div>
                    {/* Always white content */}
                    <div className="py-1 bg-white">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          onClick={handleNavClick}
                          className={({ isActive }) =>
                            `block px-4 py-2 text-sm ${
                              isActive
                                ? "bg-gray-100 text-gray-900 font-medium"
                                : "text-gray-700 hover:bg-gray-100"
                            }`
                          }>
                          {child.name}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Regular Item
              <div className="relative">
                <NavLink
                  to={item.path}
                  onClick={handleNavClick}
                  className={({ isActive }) =>
                    `flex items-center ${
                      !open ? "justify-center" : "gap-3"
                    } rounded-lg px-3 py-2 transition-colors ${
                      isActive
                        ? isDarkMode
                          ? "bg-white text-black"
                          : "bg-black text-white"
                        : isDarkMode
                        ? "text-gray-300 hover:bg-white/10"
                        : "text-gray-700 hover:bg-black/10"
                    }`
                  }>
                  <item.icon className="h-5 w-5" />
                  <span
                    className={`text-sm font-medium transition-opacity duration-300 ${
                      open ? "opacity-100" : "opacity-0 absolute"
                    }`}>
                    {item.name}
                  </span>
                </NavLink>

                {/* Tooltip for regular items when collapsed */}
                {!open && hoveredItem === item.name && (
                  <div className="absolute left-full ml-2 top-0 w-32 rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
                    <div className="px-3 py-2 font-medium bg-black text-white">
                      {item.name}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Theme Toggle */}
      <div
        className="border-t border-gray-200/10 px-3 py-4"
        onMouseEnter={() => handleItemHover("theme")}
        onMouseLeave={handleItemLeave}
        ref={(el) => (dropdownRefs.current["theme"] = el)}>
        <button
          onClick={toggleTheme}
          className={`flex w-full items-center ${
            !open ? "justify-center" : "gap-3"
          } rounded-lg px-3 py-2 ${
            isDarkMode
              ? "text-gray-300 hover:bg-white/10"
              : "text-gray-700 hover:bg-black/10"
          }`}>
          {isDarkMode ? (
            <SunIcon className="h-5 w-5" />
          ) : (
            <MoonIcon className="h-5 w-5" />
          )}
          <span
            className={`text-sm font-medium transition-opacity duration-300 ${
              open ? "opacity-100" : "opacity-0 absolute"
            }`}>
            {isDarkMode ? "Light Mode" : "Dark Mode"}
          </span>
        </button>

        {/* Tooltip for theme toggle when collapsed */}
        {!open && hoveredItem === "theme" && (
          <div className="absolute left-full ml-2 bottom-4 w-32 rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
            <div className="px-3 py-2 font-medium bg-black text-white">
              {isDarkMode ? "Light Mode" : "Dark Mode"}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
