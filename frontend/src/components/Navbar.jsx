import React, { Fragment, useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { yumix2, chefIcon } from "../assets/assets.jsx";
import { Menu, Transition } from "@headlessui/react";
import {
  UserIcon,
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  Bars3Icon,
  Cog6ToothIcon,
  BellIcon,
  BookmarkIcon,
  CurrencyDollarIcon,
  SunIcon,
  MoonIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../context/ThemeContext";
import NotificationsPopover from "./NotificationsPopover";
import {
  FacebookShareButton,
  TwitterShareButton,
  WhatsappShareButton,
  LinkedinShareButton,
  FacebookIcon,
  TwitterIcon,
  WhatsappIcon,
  LinkedinIcon,
} from "react-share";
import { useAuth } from "../context/AuthContext";
import SearchBar from "./SearchBar";
import { motion, AnimatePresence } from "framer-motion";

const Navbar = ({
  isAuthenticated,
  userName,
  userEmail = "user@example.com", // Add default email
  userImage,
  handleLogout,
  toggleSidebar,
  isSidebarCollapsed,
}) => {
  const { isDarkMode, toggleTheme } = useTheme();
  const { isAuthenticated: authIsAuthenticated, logout, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navbarRef = useRef(null);
  const [timeoutId, setTimeoutId] = useState(null);

  // Listen for scroll events to collapse navbar
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setScrolled(scrollPosition > 100);
    };

    // Add debounced scroll listener
    let timeout;
    const onScroll = () => {
      if (timeout) {
        window.cancelAnimationFrame(timeout);
      }
      timeout = window.requestAnimationFrame(handleScroll);
    };

    window.addEventListener("scroll", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.cancelAnimationFrame(timeout);
    };
  }, []);

  // Only expand navbar when at the top of page, ignore hover
  const handleNavbarInteraction = () => {
    // No action on hover - stay collapsed when scrolled down
  };

  // Simplify by removing the auto-collapse on mouse leave
  const handleNavbarMouseLeave = () => {
    // No action on mouse leave
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  // Define theme-based styles
  const navbarBgClass = isDarkMode ? "bg-[#1A3A5F]/75" : "bg-[#F8F0E3]/75"; // Updated to match sidebar

  const borderClass = isDarkMode
    ? "border border-[#FFCF50]/30"
    : "border-2 border-[#23486A]"; // Blue border for light mode

  const textColorClass = isDarkMode ? "text-white" : "text-[#23486A]";

  const hoverColorClass = isDarkMode
    ? "hover:text-[#FFCF50]"
    : "hover:text-[#23486A]";

  // Same border style for both icons
  const iconBorderClass = isDarkMode
    ? "border border-[#FFCF50]/40"
    : "border border-[#23486A]/60";

  // Fixed width for username to ensure proper layout even with longer names
  const nameWidthClass = "w-24 sm:w-auto";

  // Diagonal stripes background style for dropdown
  const stripesBackground = `repeating-linear-gradient(
    45deg,
    #F8F9FA,
    #F8F9FA 5px,
    #E9F0F8 5px,
    #E9F0F8 10px
  )`;

  // Animation variants for navbar
  const navbarVariants = {
    expanded: {
      width: isAuthenticated ? "500px" : "480px",
      height: "64px", // h-16
      borderRadius: "16px", // rounded-2xl
      right: "5rem", // right-20
      top: "16px", // top-1
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 15,
        duration: 0.4,
      },
    },
    collapsed: {
      width: "56px", // w-14
      height: "56px", // h-14
      borderRadius: "12px", // Keep as rounded square, not circle
      right: "1rem", // right-4
      top: "1rem", // top-4
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 15,
        duration: 0.2,
      },
    },
  };

  // Animation variants for inner content
  const contentVariants = {
    visible: {
      opacity: 1,
      transition: { delay: 0.1, duration: 0.2 },
    },
    hidden: {
      opacity: 0,
      transition: { duration: 0.1 },
    },
  };

  return (
    <>
      {/* Desktop Navbar with Framer Motion */}
      <motion.div
        ref={navbarRef}
        onClick={handleNavbarInteraction}
        onMouseEnter={handleNavbarInteraction}
        onMouseLeave={handleNavbarMouseLeave}
        className={`fixed z-50 ${navbarBgClass} shadow-xl ${borderClass} flex justify-between items-center pr-2`}
        style={{ marginLeft: "auto" }}
        initial="expanded"
        animate={scrolled ? "collapsed" : "expanded"}
        variants={navbarVariants}
        whileHover={scrolled ? {} : {}}>
        {/* Left side - Logo and sidebar toggle */}
        <div className="flex items-center space-x-3 h-full">
          {/* Mobile sidebar toggle with conditional rendering */}
          <AnimatePresence>
            {!scrolled && (
              <motion.button
                onClick={toggleSidebar}
                className={`md:hidden ${textColorClass} ${hoverColorClass} transition-colors duration-200 focus:outline-none`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}>
                <Bars3Icon className="w-7 h-7" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Logo or Chef Icon - always visible */}
          <div className="flex items-center justify-center h-full w-full">
            <div
              className={`flex items-center justify-center ${
                scrolled
                  ? "w-full h-full px-1.5 rounded-lg overflow-hidden" // Square box with rounded corners
                  : "w-12 h-12 rounded-full"
              }`}
              // style={
              // {
              // backgroundColor: "#1A3A5F", // Always use the blue color in both modes
              // opacity: scrolled ? 0.9 : 1,
              // border: "none", // Explicitly remove any borders
              // boxShadow: "0 0 0 1px rgba(26, 58, 95, 0.9)", // Add a blue shadow instead of a border
              // }
              // }
            >
              {scrolled ? (
                // When collapsed - Chef Icon with strict circular styling
                <div className="w-12 h-12 flex items-center justify-center rounded-full overflow-hidden">
                  <motion.img
                    src={chefIcon}
                    alt="YuMix"
                    className="w-10 h-10 mr-2 rounded-full object-cover"
                    animate={{
                      scale: [1, 1.05, 1],
                      transition: {
                        repeat: Infinity,
                        repeatType: "reverse",
                        duration: 1.5,
                      },
                    }}
                    title="Scroll to top to expand navigation"
                  />
                </div>
              ) : (
                // When expanded - Logo
                <div
                  className={`${
                    !isDarkMode ? "bg-[#1A3A5F] h-12 w-12 rounded-full" : ""
                  }`}>
                  <motion.img
                    src={yumix2}
                    alt="YuMix"
                    className="h-12 w-12 object-contain"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center section - Search Bar with conditional rendering */}
        <AnimatePresence>
          {!scrolled && (
            <motion.div
              className="flex-1 flex justify-center"
              variants={contentVariants}
              initial="hidden"
              animate="visible"
              exit="hidden">
              <div className="w-40 sm:w-44 md:w-52 px-2">
                <SearchBar
                  onRecipeClick={(recipe) => {
                    // Create a modal handler function in Navbar
                    if (
                      window.showRecipeModal &&
                      typeof window.showRecipeModal === "function"
                    ) {
                      window.showRecipeModal(recipe);
                    }
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right side - Theme toggle and user menu/sign in with conditional rendering */}
        <AnimatePresence>
          {!scrolled && (
            <motion.div
              className="flex items-center space-x-2"
              variants={contentVariants}
              initial="hidden"
              animate="visible"
              exit="hidden">
              {/* Theme Toggle */}
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full ${iconBorderClass}`}>
                <button
                  onClick={toggleTheme}
                  className={`rounded-full p-1 transition-colors duration-200 ${textColorClass} ${hoverColorClass}`}
                  aria-label="Toggle dark mode">
                  {isDarkMode ? (
                    <SunIcon className="h-6 w-6" />
                  ) : (
                    <MoonIcon className="h-6 w-6" />
                  )}
                </button>
              </div>

              {isAuthenticated ? (
                /* User Dropdown for logged-in users */
                <div className="flex items-center gap-2">
                  {/* Notifications - Use NotificationsPopover component */}
                  <NotificationsPopover />

                  {/* User Menu */}
                  <div className="relative">
                    <Menu as="div" className="relative inline-block text-left">
                      {({ open }) => (
                        <>
                          <div>
                            <Menu.Button
                              onClick={() => setIsOpen(!isOpen)}
                              className={`flex items-center ${textColorClass} ${hoverColorClass} transition-colors duration-200 group`}>
                              <div
                                className={`flex items-center justify-center w-10 h-10 rounded-full ${
                                  isDarkMode
                                    ? "bg-[#FFCF50]/10 border border-[#FFCF50]/40"
                                    : "bg-[#23486A] border border-[#23486A]/60"
                                }`}>
                                <img
                                  src={chefIcon}
                                  alt="User"
                                  className="w-8 h-8 rounded-full object-contain"
                                />
                              </div>
                              {isDarkMode ? (
                                <ChevronDownIcon
                                  className={`flex-shrink-0 w-4 h-4 ml-1 group-hover:text-[#FFCF50] transition duration-200 transform ${
                                    open ? "rotate-180" : ""
                                  } hidden md:block`}
                                />
                              ) : (
                                <ChevronDownIcon
                                  className={`flex-shrink-0 w-4 h-4 ml-1 transition duration-200 transform ${
                                    open ? "rotate-180" : ""
                                  } hidden md:block`}
                                />
                              )}
                            </Menu.Button>
                          </div>
                          <Transition
                            as={Fragment}
                            enter="transition ease-out duration-100"
                            enterFrom="transform opacity-0 scale-95"
                            enterTo="transform opacity-100 scale-100"
                            leave="transition ease-in duration-75"
                            leaveFrom="transform opacity-100 scale-100"
                            leaveTo="transform opacity-0 scale-95">
                            <Menu.Items
                              className="absolute right-0 mt-4 w-64 origin-top-right rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none overflow-hidden border border-[#FFCF50]/20"
                              style={{ background: stripesBackground }}>
                              <div className="relative">
                                {/* Blue overlay for entire dropdown */}
                                <div className="absolute inset-0 bg-[#23486A]/5"></div>

                                {/* User info with image */}
                                <div className="p-4 border-b border-[#23486A]/20 relative z-10">
                                  <div className="flex flex-col items-center">
                                    <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-[#23486A] mb-2 bg-white">
                                      <img
                                        src={
                                          user?.profileImage ||
                                          user?.profilePicture ||
                                          chefIcon
                                        }
                                        alt={userName || user?.name || "User"}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    <h3 className="font-bold text-[#23486A] text-lg">
                                      {userName || user?.name || "User"}
                                    </h3>
                                    <p className="text-sm text-[#23486A]/60">
                                      {userEmail ||
                                        user?.email ||
                                        "user@example.com"}
                                    </p>
                                  </div>
                                </div>

                                {/* Menu items */}
                                <div className="py-2 relative z-10">
                                  <Menu.Item
                                    as="a"
                                    href="/profile"
                                    className="flex items-center px-3 py-2 text-sm text-[#23486A] hover:bg-[#F5F5F5] rounded-md">
                                    <UserIcon className="h-5 w-5 mr-3 text-[#23486A]" />
                                    My Profile
                                  </Menu.Item>

                                  <Menu.Item
                                    as={Link}
                                    to="/subscription"
                                    className="flex items-center px-3 py-2 text-sm text-[#23486A] hover:bg-[#F5F5F5] rounded-md">
                                    <CurrencyDollarIcon className="h-5 w-5 mr-3 text-[#23486A]" />
                                    Subscription
                                  </Menu.Item>

                                  <div className="border-t border-[#23486A]/10 mt-2 pt-2">
                                    <Menu.Item>
                                      {({ active }) => (
                                        <button
                                          onClick={handleLogout || logout}
                                          className={`${
                                            active ? "bg-[#FFCF50]/10" : ""
                                          } flex items-center w-full px-4 py-3 text-sm text-[#23486A] hover:text-[#23486A] transition-colors duration-200`}>
                                          <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 text-[#23486A]/70" />
                                          Logout
                                        </button>
                                      )}
                                    </Menu.Item>
                                  </div>
                                </div>
                              </div>
                            </Menu.Items>
                          </Transition>
                        </>
                      )}
                    </Menu>
                  </div>
                </div>
              ) : (
                /* Sign In button for logged-out users */
                <Link
                  to="/login"
                  className={`px-4 py-2 text-sm bg-gradient-to-r from-[#FFCF50] to-[#FFB347] text-[#23486A] font-bold rounded-md border-2 border-[#23486A] transition-colors hover:opacity-90`}>
                  Sign In
                </Link>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
};

export default Navbar;
