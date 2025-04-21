import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useSubscription } from "../context/SubscriptionContext";
import useAuthModal from "../hooks/useAuthModal";
import { showToast } from "@/utils/toast";
import { dashboardPoster } from "../assets/assets";
import {
  ArrowRightIcon,
  ArrowPathRoundedSquareIcon,
  BeakerIcon,
  MagnifyingGlassIcon,
  FireIcon,
  HeartIcon as HeartOutline,
  ClockIcon,
  UserGroupIcon,
  UserIcon,
  SparklesIcon,
  // ChevronDownIcon,
  ChevronDoubleDownIcon,
  Bars3Icon,
} from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid";
import axiosInstance from "../config/axios";
import AuthModal from "../components/AuthModal";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import {
  getUserFavorites,
  addFavorite,
  removeFavorite,
  toggleFavorite,
} from "../services/userService";
import { useFavorites } from "../context/FavoritesContext";
import { addToHistory } from "../services/recipeService";
import {
  UnifiedRecipeModal,
  FavoritesLimitAlert,
  FeaturedRecipeSlider,
  FavoritesDebugger,
} from "../components";

// Simple debounce function
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const Dashboard = () => {
  const { isAuthenticated, user, token, loading: authLoading } = useAuth();
  const [featuredRecipes, setFeaturedRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const { isFavorite, addToFavorites, removeFromFavorites, fetchFavorites } =
    useFavorites();
  const navigate = useNavigate();
  const { showAuthModal, setShowAuthModal, setFeatureName, featureName } =
    useAuthModal();
  const [authChecked, setAuthChecked] = useState(false);
  const { isDarkMode } = useTheme();

  // Add refs to track fetch status and prevent duplicates
  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  const authFixAttemptedRef = useRef(false);
  const recipesCache = useRef([]);

  // Debug auth state with improved information
  useEffect(() => {
    // Mark auth as checked after first render
    setAuthChecked(true);

    // Wait a bit to determine if we should stop the dashboard loading state
    setTimeout(() => {
      setDashboardLoading(false);
    }, 300);
  }, [isAuthenticated, user]);

  // Force check authentication on mount - improved version
  useEffect(() => {
    // Prevent multiple executions
    if (authFixAttemptedRef.current) return;

    // Check if token exists in localStorage but isAuthenticated is false
    const token = localStorage.getItem("token");
    const storedUserJson = localStorage.getItem("user");

    // Check for auth=true in URL which indicates we just got redirected from login
    const searchParams = new URLSearchParams(window.location.search);
    const authParamExists = searchParams.get("auth") === "true";

    // If we're directly coming from login, keep dashboard loading until auth is verified
    if (authParamExists || localStorage.getItem("justLoggedIn") === "true") {
      setDashboardLoading(true);
    }

    // If we have the auth param, we should force a page refresh once to ensure the dashboard loads
    // with the correct auth state
    if (
      token &&
      storedUserJson &&
      authParamExists &&
      !window.cleanedAuthParam
    ) {
      // Set flag so we don't create an infinite loop
      window.cleanedAuthParam = true;

      // Clean up URL by removing auth param and reload
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      window.location.reload();
      return;
    }

    // Only fix auth state for dashboard pages if there's a mismatch
    if (
      token &&
      storedUserJson &&
      !isAuthenticated &&
      !window.authFixAttempted &&
      (window.location.pathname === "/dashboard" ||
        window.location.pathname === "/")
    ) {
      // Mark that we've tried to fix auth so we don't get into an infinite loop
      window.authFixAttempted = true;
      authFixAttemptedRef.current = true;

      try {
        // Force update auth state via storage event instead of directly setting user
        window.dispatchEvent(new Event("storage"));

        // If we still didn't get authenticated, refresh once
        setTimeout(() => {
          const stillNotAuth = !localStorage.getItem("lastTokenValidation");
          if (token && storedUserJson && !isAuthenticated && stillNotAuth) {
            window.location.reload();
          }
          // End the dashboard loading state after the check
          setDashboardLoading(false);
        }, 800);
      } catch (error) {
        setDashboardLoading(false);
      }
    } else {
      // If we don't need to do any special auth fixing, end loading state
      setTimeout(() => {
        setDashboardLoading(false);
      }, 100);
    }
  }, [isAuthenticated]);

  // Add a useEffect to detect login redirects
  useEffect(() => {
    // If just logged in, force a reload of featured recipes with auth token
    const justLoggedIn = localStorage.getItem("justLoggedIn");
    if (justLoggedIn === "true") {
      fetchFeaturedRecipes();
      // Only remove the flag once we've handled it
      setTimeout(() => {
        localStorage.removeItem("justLoggedIn");
      }, 500);
    }
  }, [isAuthenticated]);

  // Refetch when auth state changes - with debounce to prevent hammering
  useEffect(() => {
    // Only fetch if auth state is confirmed and no recent fetch
    if (authChecked && !isFetchingRef.current) {
      // Debounced fetch to prevent multiple rapid calls
      const now = Date.now();
      if (now - lastFetchTimeRef.current > 2000) {
        fetchFeaturedRecipes();
        lastFetchTimeRef.current = now;
      }
    }
  }, [isAuthenticated, authChecked]);

  useEffect(() => {
    // Fetch featured recipes on initial load
    if (!isFetchingRef.current && featuredRecipes.length === 0) {
      fetchFeaturedRecipes();
    }
  }, []);

  const fetchFeaturedRecipes = async () => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) return;

    // If we have cached recipes and it's been less than 10 seconds, use the cache
    const now = Date.now();
    if (
      recipesCache.current.length > 0 &&
      now - lastFetchTimeRef.current < 10000
    ) {
      setFeaturedRecipes(recipesCache.current);
      return;
    }

    isFetchingRef.current = true;

    try {
      setLoading(true);
      const response = await axiosInstance.get("/api/recipes/featured");
      const recipes = response.data.data || [];
      setFeaturedRecipes(recipes);
      recipesCache.current = recipes;
      lastFetchTimeRef.current = now;
    } catch (error) {
      showToast("Unable to load recipes. Please try again later.", "error");
      setFeaturedRecipes([]);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  const handleStartCooking = () => {
    if (isAuthenticated) {
      navigate("/search-recipe");
    } else {
      setFeatureName("Recipe Search");
      setShowAuthModal(true);
    }
  };

  const handleAIRecipeGenerator = () => {
    if (isAuthenticated) {
      navigate("/recipe-generator");
    } else {
      setFeatureName("AI Recipe Generator");
      setShowAuthModal(true);
    }
  };

  // Debounced history tracking to prevent multiple calls
  const addToHistoryDebounced = debounce(async (recipeId) => {
    try {
      const result = await addToHistory(recipeId);
      if (!result.success) {
        console.log(`History update skipped: ${result.message}`);
      }
    } catch (error) {
      // Fallback error handler for unexpected errors
      console.error("Unexpected error in history tracking:", error);
    }
  }, 300);

  const handleViewRecipe = async (recipe) => {
    if (isAuthenticated) {
      // Set recipe first for immediate UI response
      setSelectedRecipe(recipe);

      // Only add to history if recipe has a valid ID
      if (recipe && recipe._id && recipe._id.match(/^[0-9a-fA-F]{24}$/)) {
        addToHistoryDebounced(recipe._id);
      }
    } else {
      setFeatureName("Recipe View");
      setShowAuthModal(true);
    }
  };

  const closeRecipeModal = () => {
    setSelectedRecipe(null);
  };

  // Debounced favorite toggle to prevent rapid API calls
  const toggleFavoriteDebounced = debounce(
    async (recipeId, isFavoriteNow, recipeData) => {
      try {
        // Use the combined toggleFavorite function instead
        return await toggleFavorite(recipeId, isFavoriteNow, recipeData);
      } catch (error) {
        console.error("Error in toggleFavoriteDebounced:", error);
        showToast("An error occurred while updating favorites", "error");
        return {
          success: false,
          message: error?.message || "Failed to update favorites",
        };
      }
    },
    300
  );

  const handleToggleFavorite = async (e, recipe) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling

    if (!user) {
      showToast("Please log in to save favorites", "info");
      navigate("/login");
      return;
    }

    try {
      // Ensure recipe has an _id property
      const recipeId = recipe?._id;
      if (!recipeId) {
        showToast("Invalid recipe data", "error");
        return;
      }

      const currentlyFavorite = isFavorite(recipeId);

      // Optimistically update UI
      if (currentlyFavorite) {
        removeFromFavorites(recipeId);
      } else {
        addToFavorites(recipeId);
      }

      // Make API call with debounce - pass recipe data for new favorites
      const response = await toggleFavoriteDebounced(
        recipeId,
        !currentlyFavorite,
        !currentlyFavorite ? recipe : null
      );

      // Check if response exists and has a success property that is explicitly false
      if (response && response.success === false) {
        // Only revert and show error if success is explicitly false
        if (currentlyFavorite) {
          addToFavorites(recipeId);
        } else {
          removeFromFavorites(recipeId);
        }

        // Special handling for limit reached error
        if (response.limitReached) {
          showToast(`${response.message}`, "error");
          // Refresh favorites to ensure we have the latest limits
          fetchFavorites(true);
        } else {
          showToast(response.message || "Failed to update favorites", "error");
        }
      } else {
        // Show custom success message for successful operations
        showToast(
          currentlyFavorite ? "Removed from favorites" : "Added to favorites",
          "success"
        );
        // Refresh favorites to update limits info
        fetchFavorites(true);
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      showToast("An error occurred while updating favorites", "error");
    }
  };

  // Set window.showRecipeModal for compatibility
  useEffect(() => {
    // Store original function if it exists
    const originalShowRecipeModal = window.showRecipeModal;

    // Define our function that updates React state
    window.showRecipeModal = (recipe) => {
      setSelectedRecipe(recipe);
    };

    // Cleanup when component unmounts
    return () => {
      window.showRecipeModal = originalShowRecipeModal;
    };
  }, []);

  return (
    <>
      {/* Show loading indicator when dashboard is in loading state */}
      {dashboardLoading ? (
        <div className="flex justify-center items-center min-h-[80vh]">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#FFCF50]"></div>
        </div>
      ) : (
        <>
          {/* Welcome Hero - No longer need conditional rendering */}
          <section className="mb-10 mt-6 px-0">
            {/* Container with blue background and reduced padding */}
            <div
              className={`${
                isDarkMode ? "bg-[#1A3A5F]/75" : "bg-[#F8F0E3]/75"
              } rounded-lg p-8 md:p-16 shadow-2xl`}>
              {/* Inner banner container - removed rounded edges */}
              <div className="overflow-hidden shadow-xl border border-[#FFCF50] relative mx-auto max-w-7xl">
                {/* Background with grid pattern */}
                <div className="absolute inset-0 bg-[#fdc959] z-0">
                  <div className="w-full h-full grid grid-cols-12 grid-rows-6">
                    {/* Grid lines - vertical */}
                    {[...Array(13)].map((_, i) => (
                      <div
                        key={`v-${i}`}
                        className="absolute h-full w-[1px] bg-white/50"
                        style={{ left: `${(i / 12) * 100}%` }}></div>
                    ))}
                    {/* Grid lines - horizontal */}
                    {[...Array(7)].map((_, i) => (
                      <div
                        key={`h-${i}`}
                        className="absolute w-full h-[1px] bg-white/50"
                        style={{ top: `${(i / 6) * 100}%` }}></div>
                    ))}
                  </div>
                </div>

                {/* Main content container - Reduced height further */}
                <div className="relative z-10 flex flex-col md:flex-row p-0 md:p-0 min-h-[280px]">
                  {/* Left side - Image - Touching the sides of container */}
                  <div className="w-full md:w-7/12 flex-shrink-0 flex items-end justify-start h-full p-0">
                    <img
                      src={dashboardPoster}
                      alt="Chef preparing meal"
                      className="w-full h-auto object-contain object-left-bottom"
                      style={{ marginBottom: "-5px", marginLeft: "-5px" }}
                    />
                  </div>

                  {/* Right side - Content - Adjusted spacing */}
                  <div className="w-full md:w-5/12 flex flex-col justify-center py-6 md:pr-6 md:pl-4">
                    {/* Logo and title area */}
                    <div className="mb-4">
                      <h1 className="text-4xl md:text-5xl font-light text-orange-800 ml-12 font-cursive italic mb-2">
                        Yum!X
                      </h1>
                      <div className="flex items-center">
                        {/* <div className="w-0.5 h-10 bg-[#1A3A5F]/40 mr-4 hidden md:block"></div> */}
                        <h2 className="text-xl md:text-xl font-medium text-orange-500 pt-2 font-poppins italic text-right">
                          Flavors crafted from whatever you have
                        </h2>
                      </div>
                    </div>

                    {/* Description - Adjusted margins */}
                    <p className="text-base md:text-lg mb-4 font-poppins leading-relaxed italic text-right text-[#1A3A5F]">
                      Discover recipes tailored to your ingredients. Search by
                      what you have or find popular dishes to cook today. Turn
                      everyday items into extraordinary meals.
                    </p>

                    {/* Heading without white background */}
                    <h3 className="text-2xl font-bold text-[#1A3A5F] mb-4 text-center">
                      Create Delicious Meals
                    </h3>

                    {/* Action buttons - Outside white box with better shadows */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        onClick={handleStartCooking}
                        className="px-4 py-3 bg-gradient-to-r from-[#FFCF50] to-[#F7B500] border-2 border-amber-700 text-[#1A3A5F] font-bold rounded-lg shadow-[0_4px_8px_rgba(0,0,0,0.15),0_2px_4px_rgba(247,181,0,0.5)] hover:shadow-[0_6px_12px_rgba(0,0,0,0.2),0_3px_6px_rgba(247,181,0,0.6)] transform hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center text-base">
                        <MagnifyingGlassIcon className="w-5 h-5 mr-2" />
                        Search Recipes
                      </button>
                      <button
                        onClick={handleAIRecipeGenerator}
                        className="px-4 py-3 bg-gradient-to-r from-[#E1EBF4] to-[#d2e3f7] border-2 border-blue-500 text-[#1A3A5F] font-bold rounded-lg shadow-[0_4px_8px_rgba(0,0,0,0.15),0_2px_4px_rgba(26,58,95,0.3)] hover:shadow-[0_6px_12px_rgba(0,0,0,0.2),0_3px_6px_rgba(26,58,95,0.4)] transform hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center text-base">
                        <SparklesIcon className="w-5 h-5 mr-2" />
                        AI Recipe Creator
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Down arrow positioned below the banner */}
            <div className="flex justify-center mt-7 mb-8">
              <ChevronDoubleDownIcon
                className={`w-10 h-10 ${
                  isDarkMode ? "text-[#F7B500]" : "text-[#1A3A5F]"
                } animate-bounce`}
              />
            </div>
          </section>

          {/* Main Content Area */}
          <div className="w-full px-0 mx-auto space-y-4">
            {/* Favorites Limit Alert */}
            <FavoritesLimitAlert className="mb-4" />

            {/* Favorites Debugger - only visible in development */}
            {/* {process.env.NODE_ENV !== "production" && (
              <FavoritesDebugger className="mb-4" />
            )} */}

            {/* Featured Recipes Section */}
            <section className="mb-8">
              <FeaturedRecipeSlider
                recipes={featuredRecipes}
                loading={loading}
                onViewRecipe={handleViewRecipe}
                onToggleFavorite={handleToggleFavorite}
                isFavorite={isFavorite}
              />
            </section>
          </div>
        </>
      )}

      {/* Recipe Modal */}
      <UnifiedRecipeModal
        recipe={selectedRecipe}
        isOpen={!!selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
        onToggleFavorite={handleToggleFavorite}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        featureName={featureName}
      />
    </>
  );
};

export default Dashboard;
