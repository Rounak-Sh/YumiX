import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { yumix2 } from "../assets/assets.jsx";
import { useSubscription } from "../context/SubscriptionContext";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import {
  HomeIcon,
  MagnifyingGlassIcon,
  BookmarkIcon,
  ClockIcon,
  FireIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  QuestionMarkCircleIcon,
  UserIcon,
  Cog6ToothIcon,
  CurrencyDollarIcon,
  CreditCardIcon,
  InformationCircleIcon,
  ScaleIcon,
  ShieldCheckIcon,
  BookOpenIcon,
  BeakerIcon,
  HeartIcon,
  ArrowRightOnRectangleIcon,
  ArrowLeftOnRectangleIcon,
  ChatBubbleLeftRightIcon,
  GiftIcon,
  ShareIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  UserCircleIcon,
  SparklesIcon,
  LockClosedIcon,
  UserPlusIcon,
} from "@heroicons/react/24/solid";
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
import { AnimatePresence, motion } from "framer-motion";

const Sidebar = ({
  isAuthenticated,
  isSidebarOpen,
  handleLogout,
  handleRecipeSearchClick,
  toggleSidebar,
  handleAuthNavigation = (route) => {
    console.error("handleAuthNavigation prop not provided to Sidebar");
    // Fallback to direct navigation
    window.location.href = route;
  },
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const {
    isSubscribed,
    plan,
    remainingSearches,
    maxSearches,
    loading: subscriptionLoading,
  } = useSubscription();
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const resourcesRef = useRef(null);
  const guestResourcesRef = useRef(null);
  const guestNavRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const [guestResourcesOpen, setGuestResourcesOpen] = useState(false);

  // Extract user data or set defaults
  const userImage = user?.profilePicture || null;
  const userName = user?.name || "User";
  const userEmail = user?.email || "";

  // Function to check if a route is active
  const isActive = (path) => {
    return location.pathname === path;
  };

  // Check if any resource page is active
  const isResourcePageActive = () => {
    const resourcePages = [
      "/about",
      "/faq",
      "/privacy-policy",
      "/terms",
      "/account-help",
      "/check-ticket-status",
      "/support",
    ];
    return resourcePages.some((path) => location.pathname === path);
  };

  // Define theme-based styles
  const sidebarBgClass = isDarkMode ? "bg-[#1A3A5F]/75" : "bg-[#F8F0E3]/75";
  const textColorClass = isDarkMode ? "text-white" : "text-[#23486A]";
  const borderColorClass = isDarkMode ? "border-[#FFCF50]" : "border-[#23486A]";
  const activeClass = isDarkMode
    ? "bg-[#FFCF50]/20 border-l-4 border-[#FFCF50]"
    : "bg-[#23486A]/10 border-l-4 border-[#23486A]";
  const hoverClass = isDarkMode
    ? "hover:bg-[#FFCF50]/20"
    : "hover:bg-[#23486A]/10";
  const cardBgClass = isDarkMode ? "bg-[#1A3A5F]" : "bg-white";
  const activeButtonClass = "bg-[#FFCF50] text-[#23486A] font-semibold";
  const inactiveButtonClass = `${textColorClass} hover:bg-[#23486A]/10`;
  // Updated icon color to ensure visibility in both modes
  const iconClass = isDarkMode ? "" : "text-[#23486A]";

  // Guest mode navigation sections - only showing items not already in main navigation
  const guestSections = [
    {
      id: "about",
      title: "About Yum!X",
      icon: <InformationCircleIcon className="w-5 h-5" />,
      path: "/about",
    },
    {
      id: "faq",
      title: "FAQ / Help Center",
      icon: <QuestionMarkCircleIcon className="w-5 h-5" />,
      path: "/faq",
    },
    {
      id: "account-help",
      title: "Account Management",
      icon: <UserCircleIcon className="w-5 h-5" />,
      path: "/account-help",
    },
    {
      id: "privacy",
      title: "Privacy Policy",
      icon: <ScaleIcon className="w-5 h-5" />,
      path: "/privacy-policy",
    },
    {
      id: "terms",
      title: "Terms & Conditions",
      icon: <ShieldCheckIcon className="w-5 h-5" />,
      path: "/terms",
    },
  ];

  // Update active section based on current location
  useEffect(() => {
    const currentPath = location.pathname;
    const isOnResourcePage = isResourcePageActive();

    if (isOnResourcePage) {
      // Find which resource section is active
      const matchedSection = guestSections.find(
        (section) => section.path === currentPath
      );

      if (matchedSection) {
        setActiveSubmenu(matchedSection.id);
      }

      // Keep the appropriate dropdown open based on auth status
      if (isAuthenticated) {
        setResourcesOpen(true);
      } else {
        setGuestResourcesOpen(true);
      }
    } else {
      // Close the dropdowns when navigating to non-resource pages
      setResourcesOpen(false);
      setGuestResourcesOpen(false);
    }
  }, [location.pathname, isAuthenticated]);

  // Auto-close resources dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only close the dropdown via outside click when NOT on a resource page
      const isOnResourcePage = isResourcePageActive();

      // If on a resource page, don't close via outside clicks
      if (isOnResourcePage) return;

      // If NOT on a resource page, close when clicking outside
      if (
        resourcesRef.current &&
        !resourcesRef.current.contains(event.target)
      ) {
        setResourcesOpen(false);
      }

      if (
        guestResourcesRef.current &&
        !guestResourcesRef.current.contains(event.target)
      ) {
        setGuestResourcesOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Check for scroll arrows visibility
  useEffect(() => {
    const checkForArrows = () => {
      if (guestNavRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = guestNavRef.current;
        setShowLeftArrow(scrollLeft > 0);
        setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
      }
    };

    if (!isAuthenticated) {
      checkForArrows();
      window.addEventListener("resize", checkForArrows);

      return () => {
        window.removeEventListener("resize", checkForArrows);
      };
    }
  }, [isAuthenticated]);

  // Function to scroll the navigation horizontally
  const scrollGuestNav = (direction) => {
    if (guestNavRef.current) {
      const scrollAmount = direction === "left" ? -150 : 150;
      guestNavRef.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });

      // After scrolling, check if we need to show/hide arrows
      setTimeout(() => {
        const { scrollLeft, scrollWidth, clientWidth } = guestNavRef.current;
        setShowLeftArrow(scrollLeft > 0);
        setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
      }, 300);
    }
  };

  return (
    <>
      <aside
        className={`fixed ${
          isSidebarOpen ? "left-0" : "-left-64"
        } top-0 bottom-0 w-[18%] max-w-[18%] z-50 transition-all duration-300 ease-in-out ${sidebarBgClass} shadow-lg border-r border-r-[#FFCF50]/30 flex flex-col h-screen overflow-hidden`}>
        {/* Logo at the top */}
        <div className="flex justify-center items-center mt-4 mb-2">
          <div
            className={`${
              !isDarkMode
                ? "flex items-center justify-center bg-[#1A3A5F] p-4 my-2 h-20 w-auto rounded-lg"
                : ""
            }`}>
            <img
              src={yumix2}
              alt="YuMix"
              className="w-24 h-24 object-contain"
            />
          </div>
        </div>

        {/* Main sidebar content */}
        <div
          className="flex-grow overflow-y-auto custom-scrollbar mt-1"
          onWheel={(e) => {
            // Prevent event propagation to stop page scrolling
            e.stopPropagation();
          }}>
          {/* Navigation Links */}
          <nav className={`px-2 pt-1`}>
            {/* Main Navigation */}
            <ul className="space-y-2">
              {/* Home link - Always visible */}
              <li>
                <Link
                  to="/"
                  className={`flex items-center px-3 py-2 rounded-lg transition-all ${
                    isActive("/") || isActive("/dashboard")
                      ? activeButtonClass
                      : inactiveButtonClass
                  }`}>
                  <HomeIcon
                    className={`w-5 h-5 mr-2 ${
                      isActive("/") || isActive("/dashboard")
                        ? "text-[#23486A]"
                        : iconClass
                    }`}
                  />
                  <span className="flex-1">Home</span>
                </Link>
              </li>

              {/* RECIPE SECTION - Only shown for authenticated users */}
              {isAuthenticated && (
                <div className="pt-2 mt-1">
                  <h4
                    className={`text-xs uppercase tracking-wider ${
                      isDarkMode
                        ? "text-[#FFCF50]/70 font-bold"
                        : "text-[#23486A] font-bold"
                    } px-3 mb-1`}>
                    Recipes
                  </h4>
                </div>
              )}

              {/* Menu Items for Logged-in Users */}
              {isAuthenticated && (
                <>
                  {/* Recipe Search */}
                  <li>
                    <Link
                      to="/search-recipe"
                      className={`flex items-center px-3 py-2 rounded-lg transition-all ${
                        isActive("/search-recipe")
                          ? activeButtonClass
                          : inactiveButtonClass
                      }`}>
                      <MagnifyingGlassIcon
                        className={`w-5 h-5 mr-2 ${
                          isActive("/search-recipe")
                            ? "text-[#23486A]"
                            : iconClass
                        }`}
                      />
                      <span className="flex-1">Recipe Search</span>
                    </Link>
                  </li>

                  {/* AI Recipe Generator */}
                  <li>
                    <Link
                      to="/recipe-generator"
                      className={`flex items-center px-3 py-2 rounded-lg transition-all ${
                        isActive("/recipe-generator")
                          ? activeButtonClass
                          : inactiveButtonClass
                      }`}>
                      <SparklesIcon
                        className={`w-5 h-5 mr-2 ${
                          isActive("/recipe-generator")
                            ? "text-[#23486A]"
                            : iconClass
                        }`}
                      />
                      <span className="flex-1">AI Recipe Creator</span>
                    </Link>
                  </li>

                  {/* Trending Recipes */}
                  <li>
                    <Link
                      to="/trending"
                      className={`flex items-center px-3 py-2 rounded-lg transition-all ${
                        isActive("/trending")
                          ? activeButtonClass
                          : inactiveButtonClass
                      }`}>
                      <FireIcon
                        className={`w-5 h-5 mr-2 ${
                          isActive("/trending") ? "text-[#23486A]" : iconClass
                        }`}
                      />
                      <span className="flex-1">Trending Recipes</span>
                    </Link>
                  </li>

                  {/* Favorites */}
                  <li>
                    <Link
                      to="/favorites"
                      className={`flex items-center px-3 py-2 rounded-lg transition-all ${
                        isActive("/favorites")
                          ? activeButtonClass
                          : inactiveButtonClass
                      }`}>
                      <HeartIcon
                        className={`w-5 h-5 mr-2 ${
                          isActive("/favorites") ? "text-[#23486A]" : iconClass
                        }`}
                      />
                      <span className="flex-1">Favorites</span>
                    </Link>
                  </li>

                  {/* Recipe History */}
                  <li>
                    <Link
                      to="/recipe-history"
                      className={`flex items-center px-3 py-2 rounded-lg transition-all ${
                        isActive("/recipe-history")
                          ? activeButtonClass
                          : inactiveButtonClass
                      }`}>
                      <ClockIcon
                        className={`w-5 h-5 mr-2 ${
                          isActive("/recipe-history")
                            ? "text-[#23486A]"
                            : iconClass
                        }`}
                      />
                      <span className="flex-1">Recipe History</span>
                    </Link>
                  </li>

                  {/* ACCOUNT SECTION */}
                  <div className="pt-2 mt-3">
                    <h4
                      className={`text-xs uppercase tracking-wider ${
                        isDarkMode
                          ? "text-[#FFCF50]/70 font-bold"
                          : "text-[#23486A] font-bold"
                      } px-3 mb-1`}>
                      Account
                    </h4>
                  </div>

                  {/* Subscription Plans */}
                  <li>
                    <Link
                      to="/subscription"
                      className={`flex items-center px-3 py-2 rounded-lg transition-all ${
                        isActive("/subscription")
                          ? activeButtonClass
                          : inactiveButtonClass
                      }`}>
                      <CurrencyDollarIcon
                        className={`w-5 h-5 mr-2 ${
                          isActive("/subscription")
                            ? "text-[#23486A]"
                            : iconClass
                        }`}
                      />
                      <span className="flex-1">Subscription Plans</span>
                    </Link>
                  </li>

                  {/* Profile */}
                  <li>
                    <Link
                      to="/profile"
                      className={`flex items-center px-3 py-2 rounded-lg transition-all ${
                        isActive("/profile")
                          ? activeButtonClass
                          : inactiveButtonClass
                      }`}>
                      <UserIcon
                        className={`w-5 h-5 mr-2 ${
                          isActive("/profile") ? "text-[#23486A]" : iconClass
                        }`}
                      />
                      <span className="flex-1">Profile Settings</span>
                    </Link>
                  </li>

                  {/* Helpful Resources section with divider */}
                  <div className="mt-6 space-y-2" ref={resourcesRef}>
                    <div className="border-t border-[#FFCF50]/30 pt-4 mb-2">
                      <h4
                        className={`text-xs uppercase tracking-wider ${
                          isDarkMode
                            ? "text-[#FFCF50]/70 font-bold"
                            : "text-[#23486A] font-bold"
                        } px-4 mb-2`}>
                        Resources
                      </h4>
                    </div>
                    <button
                      onClick={() => {
                        const wasOpen = resourcesOpen;
                        setResourcesOpen(!resourcesOpen);

                        // If we're closing the section, scroll down to show more content
                        if (wasOpen) {
                          setTimeout(() => {
                            const sidebarContent =
                              resourcesRef.current.closest(".custom-scrollbar");
                            if (sidebarContent) {
                              sidebarContent.scrollTo({
                                top: sidebarContent.scrollTop + 200,
                                behavior: "smooth",
                              });
                            }
                          }, 100);
                        }
                      }}
                      className={`flex items-center w-full px-4 py-2.5 rounded-lg transition-all ${
                        resourcesOpen || isResourcePageActive()
                          ? activeButtonClass
                          : inactiveButtonClass
                      }`}>
                      <BookOpenIcon
                        className={`w-5 h-5 mr-3 ${
                          resourcesOpen || isResourcePageActive()
                            ? "text-[#23486A]"
                            : iconClass
                        }`}
                      />
                      <span className="flex-1 text-left">Resources & Help</span>
                      <ChevronRightIcon
                        className={`w-4 h-4 transform transition-transform ${
                          resourcesOpen || isResourcePageActive()
                            ? "rotate-90"
                            : ""
                        }`}
                      />
                    </button>

                    {/* Resources Dropdown */}
                    <AnimatePresence>
                      {(resourcesOpen || isResourcePageActive()) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden">
                          <ul className="pl-6 mt-1 space-y-2">
                            {guestSections.map((section) => (
                              <li key={section.id}>
                                <Link
                                  to={section.path}
                                  className={`flex items-center px-3 py-2 rounded-lg transition-all ${
                                    isActive(section.path)
                                      ? activeButtonClass
                                      : inactiveButtonClass
                                  }`}>
                                  {section.icon}
                                  <span className="ml-2">{section.title}</span>
                                </Link>
                              </li>
                            ))}

                            {/* My Tickets under Resources */}
                            <li>
                              <Link
                                to="/my-tickets"
                                className={`flex items-center px-3 py-2 rounded-lg transition-all ${
                                  isActive("/my-tickets") ||
                                  isActive("/support-tickets")
                                    ? activeButtonClass
                                    : inactiveButtonClass
                                }`}>
                                <ChatBubbleLeftRightIcon className="w-5 h-5" />
                                <span className="ml-2">Support Tickets</span>
                              </Link>
                            </li>
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Logout - Always at the bottom */}
                  <li className="mt-6">
                    <button
                      onClick={handleLogout}
                      className={`flex items-center w-full px-3 py-2 rounded-lg transition-all ${inactiveButtonClass}`}>
                      <ArrowRightOnRectangleIcon
                        className={`w-5 h-5 mr-2 ${iconClass}`}
                      />
                      <span className="flex-1 text-left">Logout</span>
                    </button>
                  </li>
                </>
              )}

              {/* Menu Items for Guest Users (Not Logged In) */}
              {!isAuthenticated && (
                <>
                  {/* ACCOUNT SECTION */}
                  <div className="pt-2 mt-3">
                    <h4
                      className={`text-xs uppercase tracking-wider ${
                        isDarkMode
                          ? "text-[#FFCF50]/70"
                          : "text-[#23486A] font-medium"
                      } px-3 mb-1`}>
                      Account
                    </h4>
                  </div>

                  {/* Login */}
                  <li>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handleAuthNavigation("/login");
                      }}
                      className={`flex items-center px-3 py-2 rounded-lg transition-all ${inactiveButtonClass}`}>
                      <UserIcon className={`w-5 h-5 mr-2 ${iconClass}`} />
                      <span className="flex-1">Login</span>
                    </a>
                  </li>

                  {/* Register */}
                  <li>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handleAuthNavigation("/register");
                      }}
                      className={`flex items-center px-3 py-2 rounded-lg transition-all ${inactiveButtonClass}`}>
                      <UserPlusIcon className={`w-5 h-5 mr-2 ${iconClass}`} />
                      <span className="flex-1">Create Account</span>
                    </a>
                  </li>

                  {/* Subscription Plans for Guest */}
                  <li>
                    <Link
                      to="/subscription"
                      className={`flex items-center px-3 py-2 rounded-lg transition-all ${
                        isActive("/subscription")
                          ? activeButtonClass
                          : inactiveButtonClass
                      }`}>
                      <CurrencyDollarIcon
                        className={`w-5 h-5 mr-2 ${iconClass}`}
                      />
                      <span className="flex-1">Subscription Plans</span>
                    </Link>
                  </li>

                  {/* RESOURCES SECTION FOR GUEST - Now using dropdown menu */}
                  <div
                    className="mt-6 space-y-2 border-t border-[#FFCF50]/30 pt-4"
                    ref={guestResourcesRef}>
                    <h4
                      className={`text-xs uppercase tracking-wider ${
                        isDarkMode
                          ? "text-[#FFCF50]/70"
                          : "text-[#23486A] font-medium"
                      } px-3 mb-1`}>
                      Resources
                    </h4>

                    <button
                      onClick={() => {
                        const wasOpen = guestResourcesOpen;
                        setGuestResourcesOpen(!guestResourcesOpen);

                        // If we're closing the section, scroll down to show more content
                        if (wasOpen) {
                          setTimeout(() => {
                            const sidebarContent =
                              guestResourcesRef.current.closest(
                                ".custom-scrollbar"
                              );
                            if (sidebarContent) {
                              sidebarContent.scrollTo({
                                top: sidebarContent.scrollTop + 200,
                                behavior: "smooth",
                              });
                            }
                          }, 100);
                        }
                      }}
                      className={`flex items-center w-full px-3 py-2 rounded-lg transition-all ${
                        guestResourcesOpen || isResourcePageActive()
                          ? activeButtonClass
                          : inactiveButtonClass
                      }`}>
                      <BookOpenIcon
                        className={`w-5 h-5 mr-2 ${
                          guestResourcesOpen || isResourcePageActive()
                            ? "text-[#23486A]"
                            : iconClass
                        }`}
                      />
                      <span className="flex-1 text-left">Resources & Help</span>
                      <ChevronRightIcon
                        className={`w-4 h-4 transform transition-transform ${
                          guestResourcesOpen || isResourcePageActive()
                            ? "rotate-90"
                            : ""
                        }`}
                      />
                    </button>

                    {/* Resources Dropdown for Guest */}
                    <AnimatePresence>
                      {(guestResourcesOpen || isResourcePageActive()) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden">
                          <ul className="pl-6 mt-1 space-y-2">
                            {guestSections.map((section) => (
                              <li key={section.id}>
                                <Link
                                  to={section.path}
                                  className={`flex items-center px-3 py-2 rounded-lg transition-all ${
                                    isActive(section.path)
                                      ? activeButtonClass
                                      : inactiveButtonClass
                                  }`}>
                                  {section.icon}
                                  <span className="ml-2">{section.title}</span>
                                </Link>
                              </li>
                            ))}

                            {/* My Tickets link for guests */}
                            <li>
                              <Link
                                to="/check-ticket-status"
                                className={`flex items-center px-3 py-2 rounded-lg transition-all ${
                                  isActive("/check-ticket-status")
                                    ? activeButtonClass
                                    : inactiveButtonClass
                                }`}>
                                <ChatBubbleLeftRightIcon className="w-5 h-5" />
                                <span className="ml-2">
                                  Check Ticket Status
                                </span>
                              </Link>
                            </li>
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}
            </ul>
          </nav>
        </div>

        {/* Footer Section for Subscription Info - Improved styling */}
        {isAuthenticated && (
          <div className="mt-auto px-2 py-3">
            <div
              className={`rounded-lg ${cardBgClass} p-3 shadow-md border ${
                isDarkMode ? "border-[#FFCF50]/30" : "border-[#23486A]/10"
              }`}>
              <div className="flex items-center justify-between mb-2">
                <h5
                  className={`text-sm font-semibold ${
                    isDarkMode ? "text-[#FFCF50]" : "text-[#23486A]"
                  }`}>
                  {isSubscribed ? "Premium Plan" : "Free Account"}
                </h5>
                <Link
                  to="/subscription"
                  className={`text-xs px-2 py-1 rounded-md ${
                    isDarkMode
                      ? "bg-[#FFCF50]/20 text-[#FFCF50] hover:bg-[#FFCF50]/30"
                      : "bg-[#23486A]/10 text-[#23486A] hover:bg-[#23486A]/20"
                  } transition-colors`}>
                  Upgrade
                </Link>
              </div>

              {/* Subscription Feature Display */}
              <div className="space-y-2 mt-1">
                <div className="flex items-center">
                  <MagnifyingGlassIcon
                    className={`w-5 h-5 mr-2 ${
                      isDarkMode ? "text-[#FFCF50]" : "text-[#23486A]"
                    }`}
                  />
                  <span
                    className={`text-sm ${
                      isDarkMode ? "text-white" : "text-[#23486A]"
                    }`}>
                    {subscriptionLoading ? (
                      <div className="animate-pulse bg-gray-300 h-4 w-20 rounded"></div>
                    ) : (
                      <>
                        {remainingSearches} / {maxSearches} searches
                      </>
                    )}
                  </span>
                </div>
                {isSubscribed && (
                  <div className="flex items-center">
                    <SparklesIcon
                      className={`w-5 h-5 mr-2 ${
                        isDarkMode ? "text-[#FFCF50]" : "text-[#23486A]"
                      }`}
                    />
                    <span
                      className={`text-sm ${
                        isDarkMode ? "text-white" : "text-[#23486A]"
                      }`}>
                      AI Recipe Creator
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile backdrop - only show when sidebar is open on mobile */}
      {isSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40"
          onClick={toggleSidebar}></div>
      )}
    </>
  );
};

export default Sidebar;
