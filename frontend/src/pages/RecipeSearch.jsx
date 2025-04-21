import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  useNavigate,
  useParams,
  useSearchParams,
  useLocation,
} from "react-router-dom";
import { showToast } from "../utils/toast";
import { useSubscription } from "../context/SubscriptionContext";
import { useTheme } from "../context/ThemeContext";
import {
  getRecipeById,
  searchRecipesByIngredients,
  searchFeaturedRecipes,
  getRecipeVideo,
} from "../services/recipeService";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaCarrot,
  FaAppleAlt,
  FaEgg,
  FaCheese,
  FaDrumstickBite,
  FaFish,
  FaBreadSlice,
  FaPepperHot,
} from "react-icons/fa";
import { GiMushrooms, GiHerbsBundle } from "react-icons/gi";
import { useAuth } from "../context/AuthContext";
import { useFavorites } from "../context/FavoritesContext";
import { UnifiedRecipeModal, RecipeCard } from "../components";

const INGREDIENT_CATEGORIES = {
  vegetables: {
    name: "Vegetables",
    icon: FaCarrot,
    items: ["Onion", "Tomato", "Potato", "Carrot", "Garlic", "Ginger"],
  },
  fruits: {
    name: "Fruits",
    icon: FaAppleAlt,
    items: ["Apple", "Lemon", "Lime", "Orange", "Mango", "Banana"],
  },
  protein: {
    name: "Protein",
    icon: FaEgg,
    items: ["Eggs", "Chicken", "Fish", "Beef", "Tofu", "Beans"],
  },
  dairy: {
    name: "Dairy",
    icon: FaCheese,
    items: ["Milk", "Cheese", "Butter", "Yogurt", "Cream"],
  },
  meat: {
    name: "Meat",
    icon: FaDrumstickBite,
    items: ["Chicken", "Beef", "Pork", "Lamb", "Turkey"],
  },
  seafood: {
    name: "Seafood",
    icon: FaFish,
    items: ["Fish", "Shrimp", "Crab", "Salmon", "Tuna"],
  },
  grains: {
    name: "Grains",
    icon: FaBreadSlice,
    items: ["Rice", "Pasta", "Bread", "Flour", "Oats"],
  },
  spices: {
    name: "Spices",
    icon: FaPepperHot,
    items: ["Salt", "Pepper", "Cumin", "Turmeric", "Chili"],
  },
  mushrooms: {
    name: "Mushrooms",
    icon: GiMushrooms,
    items: ["Button Mushroom", "Shiitake", "Portobello"],
  },
  herbs: {
    name: "Herbs",
    icon: GiHerbsBundle,
    items: ["Basil", "Mint", "Coriander", "Parsley", "Thyme"],
  },
};

// Create a debounce utility at the module level, outside the component
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

// Cache duration in milliseconds (5 minutes)
const SEARCH_CACHE_DURATION = 5 * 60 * 1000;

const RecipeSearch = ({ viewMode }) => {
  // Add theme context
  const { isDarkMode } = useTheme();

  // State for search input and results
  const [searchInput, setSearchInput] = useState("");
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [useVideoEmbed, setUseVideoEmbed] = useState(true);
  const dropdownRef = useRef(null);
  const { user } = useAuth();
  const {
    favorites,
    addToFavorites,
    removeFromFavorites,
    fetchFavorites,
    toggleFavorite,
    isFavorite,
  } = useFavorites();

  // Refs to manage search state and prevent redundant requests
  const searchInProgress = useRef(false);
  const lastSearchTerm = useRef("");
  const lastIngredients = useRef([]);
  const searchCache = useRef(new Map());
  const debouncedFnRef = useRef(null);

  // Get necessary context values first
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const {
    refreshSubscriptionData,
    isSubscribed,
    remainingSearches,
    maxSearches,
    updateSearchCount,
    currentPlan,
  } = useSubscription();

  // Get recipe ID from URL if in single view mode
  const { recipeId } = useParams();
  // Get search parameters from URL
  const [searchParams] = useSearchParams();
  const queryParam = searchParams.get("query");
  const ingredientsParam = searchParams.get("ingredients");

  // Check authentication status and redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      showToast("Please log in to use recipe search feature", "info");
      navigate("/login", {
        state: {
          from: location.pathname,
          returnUrl: location.pathname,
        },
      });
    }
  }, [isAuthenticated, navigate, location.pathname]);

  // Fetch recipe details if in single view mode
  useEffect(() => {
    if (viewMode === "single" && recipeId) {
      const fetchRecipeDetails = async () => {
        setLoading(true);
        try {
          const response = await getRecipeById(recipeId);
          if (response.success !== false) {
            setSelectedRecipe(response.data);
            setShowModal(true);
          } else {
            setError(response.message || "Failed to fetch recipe details");
            showToast("Failed to fetch recipe details", "error");
          }
        } catch (error) {
          setError("An error occurred while fetching recipe details");
          showToast("An error occurred while fetching recipe details", "error");
        } finally {
          setLoading(false);
        }
      };

      fetchRecipeDetails();
    }
  }, [viewMode, recipeId]);

  // Create a debounced search function with useCallback to memoize it
  const debouncedSearchFn = useCallback(
    (searchTerm, ingredients, fromUrl) => {
      if (!debouncedFnRef.current) {
        debouncedFnRef.current = debounce(
          async (searchTerm, ingredients, fromUrl) => {
            try {
              console.log("Executing debounced search:", {
                searchTerm,
                ingredients,
                fromUrl,
              });

              // Prevent concurrent searches
              if (searchInProgress.current) {
                console.log("Search already in progress, skipping");
                return;
              }

              // Don't repeat the same search
              const searchKey = JSON.stringify({
                term: searchTerm,
                ingredients: [...ingredients].sort().join(","),
              });

              if (
                searchKey ===
                JSON.stringify({
                  term: lastSearchTerm.current,
                  ingredients: [...lastIngredients.current].sort().join(","),
                })
              ) {
                console.log("Skipping duplicate search");
                return;
              }

              searchInProgress.current = true;
              setLoading(true);
              setError(null);

              // Check subscription status
              if (!isSubscribed && remainingSearches <= 0) {
                showToast(
                  "You've reached your daily search limit. Please upgrade to premium.",
                  "error"
                );
                navigate("/subscription");
                return;
              }

              // Generate cache key based on search params
              const cacheKey = searchKey;

              // Check if we have cached results
              const now = Date.now();
              const cachedResult = searchCache.current.get(cacheKey);

              if (
                cachedResult &&
                now - cachedResult.timestamp < SEARCH_CACHE_DURATION
              ) {
                console.log("Using cached search results");
                setSearchResults(cachedResult.data);
                setShowResults(true);

                // Save current search terms to prevent duplicates
                lastSearchTerm.current = searchTerm;
                lastIngredients.current = [...ingredients];

                return;
              }

              console.log("Executing search:", {
                searchTerm,
                ingredients,
                fromUrl,
              });

              // Clear any previous errors before starting a new search
              setError(null);

              let response;
              // Check if the search input contains commas (indicating ingredients list)
              const isIngredientsList = searchTerm.includes(",");

              // If input contains commas, treat it as ingredients list
              if (isIngredientsList) {
                const inputIngredients = searchTerm
                  .split(",")
                  .map((i) => i.trim())
                  .filter((i) => i.length > 0);

                const allIngredients = [
                  ...new Set([...ingredients, ...inputIngredients]),
                ];

                response = await searchRecipesByIngredients(allIngredients);
              }
              // If there are only selected ingredients from UI, use those
              else if (ingredients.length > 0) {
                response = await searchRecipesByIngredients(ingredients);
              }
              // Otherwise do a direct recipe search
              else if (searchTerm && searchTerm.trim()) {
                response = await searchFeaturedRecipes(searchTerm);
              } else {
                console.log("No search criteria provided");
                setLoading(false);
                searchInProgress.current = false;
                return;
              }

              // Save current search terms to prevent duplicates
              lastSearchTerm.current = searchTerm;
              lastIngredients.current = [...ingredients];

              if (response?.success) {
                // Handle both response structures (data or recipes field)
                const recipes = response.data || response.recipes || [];

                // Handle empty results with messages about API quota
                if (
                  recipes.length === 0 &&
                  response.source === "api_quota_exceeded"
                ) {
                  setError(
                    response.message ||
                      "Recipe search is currently unavailable due to API limits. Please try again later."
                  );
                  setLoading(false);
                  searchInProgress.current = false;
                  return;
                }

                // Special handling for database-only results
                if (
                  response.source === "database" &&
                  response.message &&
                  response.message.includes("External API quota exceeded")
                ) {
                  showToast(response.message, "info");
                }

                // Cache the results
                searchCache.current.set(cacheKey, {
                  data: recipes,
                  timestamp: now,
                });

                // Limit cache size to 10 entries to avoid memory issues
                if (searchCache.current.size > 10) {
                  const oldestKey = [...searchCache.current.keys()][0];
                  searchCache.current.delete(oldestKey);
                }

                setSearchResults(recipes);
                setShowResults(true);

                // Update search count directly from the response
                if (updateSearchCount) {
                  updateSearchCount(response);
                }

                // Refresh subscription data to get updated search counts (less frequently)
                if (
                  refreshSubscriptionData &&
                  !isSubscribed &&
                  remainingSearches <= 2
                ) {
                  refreshSubscriptionData(true).catch((err) =>
                    console.error("Error refreshing subscription data:", err)
                  );
                }

                // Update URL if not from URL parameters
                if (!fromUrl) {
                  const params = new URLSearchParams();
                  if (searchTerm) params.set("query", searchTerm);
                  if (ingredients.length)
                    params.set("ingredients", ingredients.join(","));
                  navigate(`?${params.toString()}`);
                }
              } else {
                // Check if this is a search limit error (HTTP 429)
                if (
                  response?.status === 429 ||
                  response?.errorCode === "RATE_LIMIT_EXCEEDED" ||
                  response?.message?.includes("limit")
                ) {
                  let errorMessage =
                    response.message ||
                    "You've reached your daily search limit.";

                  // Show different messages based on subscription status
                  if (!isSubscribed) {
                    errorMessage +=
                      " Please upgrade to a subscription for more searches.";
                  } else if (
                    currentPlan &&
                    currentPlan.name.includes("Basic")
                  ) {
                    errorMessage +=
                      " Please upgrade to the Pro plan for unlimited searches.";
                  } else {
                    errorMessage += " Please try again tomorrow.";
                  }

                  showToast(errorMessage, "error");

                  // Refresh subscription data to update the UI with current count
                  if (refreshSubscriptionData) {
                    refreshSubscriptionData(true).catch((err) =>
                      console.error("Error refreshing subscription data:", err)
                    );
                  }

                  // Redirect to subscription page for free users or Basic plan
                  if (
                    !isSubscribed ||
                    (currentPlan && currentPlan.name.includes("Basic"))
                  ) {
                    navigate("/subscription");
                  }
                  return;
                }

                // Special handling for 502 Bad Gateway or API quota exceeded
                else if (
                  response?.status === 502 ||
                  response?.source === "api_quota_exceeded"
                ) {
                  setError(
                    response?.message ||
                      "Recipe search service is temporarily unavailable. Please try again later or try a different search."
                  );
                }
                // Default error handling
                else {
                  setError(response?.message || "Failed to fetch recipes");
                  showToast(
                    response?.message || "Failed to fetch recipes",
                    "error"
                  );
                }
              }
            } catch (error) {
              console.error("Search error:", error);

              // Check if the error is due to hitting search limits
              if (error.response && error.response.status === 429) {
                let errorMessage;
                let isSubscriptionLimit = false;

                // Check if this is a subscription search limit or a general rate limit
                if (
                  error.response.data?.message?.includes("daily limit") ||
                  error.response.data?.message?.includes("upgrade") ||
                  error.response.data?.upgradeRequired === true
                ) {
                  // This is a subscription search limit (the user used all their daily searches)
                  isSubscriptionLimit = true;

                  // Get specific plan details from the error response if available
                  const planFromError = error.response.data?.plan || "";
                  const limitFromError = error.response.data?.limit || "";

                  // Create a more specific message based on the plan
                  if (
                    planFromError === "Basic" ||
                    (currentPlan && currentPlan.name.includes("Basic"))
                  ) {
                    errorMessage = `You've reached your daily limit of ${
                      limitFromError || 10
                    } searches on your Basic plan. Please upgrade to Premium (30 searches/day) or Pro (50 searches/day) for more searches.`;
                  } else if (
                    planFromError === "Premium" ||
                    (currentPlan && currentPlan.name.includes("Premium"))
                  ) {
                    errorMessage = `You've reached your daily limit of ${
                      limitFromError || 30
                    } searches on your Premium plan. Please upgrade to Pro (50 searches/day) for more searches or try again tomorrow.`;
                  } else if (
                    planFromError === "Pro" ||
                    (currentPlan && currentPlan.name.includes("Pro"))
                  ) {
                    errorMessage = `You've reached your daily limit of ${
                      limitFromError || 50
                    } searches on your Pro plan. Please try again tomorrow.`;
                  } else if (planFromError === "Free" || !isSubscribed) {
                    errorMessage = `You've reached your daily limit of ${
                      limitFromError || 3
                    } free searches. Please subscribe to a plan for more searches.`;
                  } else {
                    // Fallback to the server message or a generic message
                    errorMessage =
                      error.response.data?.message ||
                      "You've reached your daily search limit.";
                  }
                } else {
                  // This is a general rate limit (too many requests in a short time)
                  errorMessage =
                    "Too many search requests in a short period. Please wait 30 seconds and try again.";
                }

                showToast(errorMessage, "error");
                console.log(
                  `Rate limit hit: ${
                    isSubscriptionLimit
                      ? "Subscription limit"
                      : "General rate limit"
                  }`
                );

                // Refresh subscription data to update the UI
                if (refreshSubscriptionData) {
                  refreshSubscriptionData(true).catch((err) =>
                    console.error("Error refreshing after rate limit:", err)
                  );
                }

                // Redirect to subscription page for free users or Basic plan users
                // but only for subscription limit errors, not general rate limits
                if (
                  isSubscriptionLimit &&
                  (!isSubscribed ||
                    (currentPlan && currentPlan.name.includes("Basic")))
                ) {
                  navigate("/subscription");
                }
                return;
              }

              setError("An error occurred while searching");
              showToast("An error occurred while searching", "error");
            } finally {
              setLoading(false);
              searchInProgress.current = false;
            }
          },
          500
        );
      }

      // Now call the debounced function
      debouncedFnRef.current(searchTerm, ingredients, fromUrl);
    },
    [
      isSubscribed,
      remainingSearches,
      maxSearches,
      navigate,
      refreshSubscriptionData,
      updateSearchCount,
      showToast,
      currentPlan,
    ]
  );

  // Handle search submission - using the debounced search function
  const handleSearch = useCallback(() => {
    if (!searchInput.trim() && selectedIngredients.length === 0) {
      showToast("Please enter a search term or select ingredients", "warning");
      return;
    }

    // Update URL parameters when search is explicitly triggered
    const params = new URLSearchParams();
    if (searchInput) params.set("query", searchInput);
    if (selectedIngredients.length > 0)
      params.set("ingredients", selectedIngredients.join(","));

    // If we have parameters, update URL; otherwise clear it
    if (params.toString()) {
      navigate(`?${params.toString()}`, { replace: true });
    } else {
      navigate("/search-recipe", { replace: true });
    }

    // Trigger the debounced search with current state
    debouncedSearchFn(searchInput, selectedIngredients, false);
  }, [
    searchInput,
    selectedIngredients,
    debouncedSearchFn,
    showToast,
    navigate,
  ]);

  // Handle input field (Enter key press)
  const handleKeyPress = useCallback(
    (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSearch();
      }
    },
    [handleSearch]
  );

  // Now we can define other handlers and effects that depend on these functions
  const handleInputChange = (e) => {
    setSearchInput(e.target.value);
  };

  const clearSearch = () => {
    setSearchInput("");
    setSelectedIngredients([]);
    setSearchResults([]);
    setShowResults(false);
    lastSearchTerm.current = "";
    lastIngredients.current = [];

    // Clear URL parameters
    navigate("/search-recipe", { replace: true });
  };

  // Ingredient selection handlers
  const toggleIngredient = (ingredient) => {
    const updatedIngredients = selectedIngredients.includes(ingredient)
      ? selectedIngredients.filter((item) => item !== ingredient)
      : [...selectedIngredients, ingredient];

    setSelectedIngredients(updatedIngredients);

    // Don't update URL parameters immediately to prevent auto-search
    // We'll only update URL when the search button is clicked
    // This prevents auto-searching when ingredients are selected
  };

  const toggleCategory = (category) => {
    setExpandedCategory(expandedCategory === category ? null : category);
  };

  const openRecipeModal = async (recipe) => {
    setSelectedRecipe(recipe);
    setShowModal(true);
  };

  // Handle YouTube direct link
  const openYouTubeVideo = (videoId) => {
    window.open(`https://www.youtube.com/watch?v=${videoId}`, "_blank");
  };

  // Handle favorite toggling
  const handleToggleFavorite = async (e, recipeId, recipeData = null) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      showToast("Please log in to save favorites", "info");
      return;
    }

    try {
      // Get the current favorite status
      const currentlyFavorited = isFavorite(recipeId);

      // Use the toggleFavorite from useFavorites
      const success = await toggleFavorite(recipeId, recipeData);

      if (success) {
        showToast(
          currentlyFavorited
            ? "Recipe removed from favorites"
            : "Recipe added to favorites",
          "success"
        );
      } else {
        showToast("Failed to update favorites", "error");
      }
    } catch (error) {
      console.error("Error in handleToggleFavorite:", error);
      showToast("An error occurred while updating favorites", "error");
    }
  };

  // Handle URL query parameters - now that debouncedSearchFn is defined
  useEffect(() => {
    // This function checks if the page was refreshed
    const isPageRefresh = () => {
      // Check for navigation type
      if (window.performance) {
        const navEntries = window.performance.getEntriesByType("navigation");
        if (navEntries.length > 0 && navEntries[0].type === "reload") {
          return true;
        }

        // Fallback for browsers that don't support the above
        if (
          window.performance.navigation &&
          window.performance.navigation.type === 1
        ) {
          return true;
        }
      }
      return false;
    };

    // If this is a page refresh, clear URL parameters
    if (isPageRefresh()) {
      // Clean the URL without triggering a reload
      window.history.replaceState({}, document.title, "/search-recipe");
      return;
    }

    // Get query parameters from URL
    const params = new URLSearchParams(location.search);
    const queryParam = params.get("query");
    const ingredientsParam = params.get("ingredients");

    // Only proceed if we have parameters to process
    if (!queryParam && !ingredientsParam) {
      return;
    }

    console.log("Processing URL parameters:", { queryParam, ingredientsParam });

    // Parse ingredients from URL parameter if present
    const ingredientsFromUrl = ingredientsParam
      ? ingredientsParam
          .split(",")
          .map((i) => i.trim())
          .filter((i) => i)
      : [];

    // If we have URL parameters, set them and trigger a search
    if (queryParam || ingredientsFromUrl.length > 0) {
      // Reset the current ingredients first to avoid mixing with previous state
      setSelectedIngredients([]);

      // Update the state with the URL parameters
      if (queryParam) {
        setSearchInput(queryParam);
      }

      if (ingredientsFromUrl.length > 0) {
        setSelectedIngredients(ingredientsFromUrl);
      }

      // Use a small timeout to ensure all state updates have been processed
      setTimeout(() => {
        // Only execute search if the URL contains the "search=true" parameter
        // This prevents auto-searching when the page is first loaded with ingredients in URL
        if (params.get("search") === "true") {
          debouncedSearchFn(queryParam || "", ingredientsFromUrl, true);
        }
      }, 0);
    }
  }, [location.search, debouncedSearchFn]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setExpandedCategory(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Restore the video embed state hook
  useEffect(() => {
    if (selectedRecipe) {
      setUseVideoEmbed(true); // Reset to use iframe by default for each new recipe
    }
  }, [selectedRecipe]);

  // When search button is clicked
  const handleSearchClick = () => {
    // Add a "search=true" parameter to the URL to indicate explicit search
    const params = new URLSearchParams();
    params.set("search", "true");

    // Update the existing query/ingredient parameters
    if (searchInput) params.set("query", searchInput);
    else params.delete("query");

    if (selectedIngredients.length > 0)
      params.set("ingredients", selectedIngredients.join(","));
    else params.delete("ingredients");

    // Update URL before executing search
    navigate(`?${params.toString()}`, { replace: true });

    // Trigger the search function
    handleSearch();
  };

  // When the Clear All button is clicked
  const handleClearAll = () => {
    setSelectedIngredients([]);
    setSearchInput("");
    setSearchResults([]);
    setShowResults(false);
    lastSearchTerm.current = "";
    lastIngredients.current = [];

    // Clear URL parameters
    navigate("/search-recipe", { replace: true });
  };

  return (
    <div
      className={`${
        isDarkMode ? "bg-[#1A3A5F]/75" : "bg-[#f0f0f0]/60"
      } rounded-xl p-16 mt-8 mb-2`}>
      {/* Main content area */}
      <div className="w-full pb-0">
        <div className="max-w-7xl mx-auto">
          {/* Main content container - yellow background with grid pattern */}
          <div
            className={`bg-[#FFD15C] border-4  ${
              isDarkMode ? "border-[#192339]" : "border-[#1A3A5F]"
            } overflow-hidden shadow-xl relative`}>
            <div className="relative">
              {/* Header area */}
              <div className="px-8 pt-8 pb-4">
                <h1 className="text-3xl md:text-4xl font-bold font-poppins text-gray-100 mb-2">
                  Find Your Perfect Recipe
                </h1>
                <p className="text-[#192339]/80 text-lg mb-6">
                  Search by ingredients you have, dish name, or cuisine type.
                  Discover delicious recipes tailored to what you have on hand.
                </p>

                {/* Search box inner container - blue background */}
                <div
                  className={`${
                    isDarkMode ? "bg-[#192339]" : "bg-[#2A3B5C]"
                  } rounded-xl p-6 shadow-lg mb-6`}>
                  <div className="flex gap-3">
                    <div className="relative flex-grow">
                      <input
                        type="text"
                        value={searchInput}
                        onChange={handleInputChange}
                        placeholder="Search by recipe name or ingredients (comma-separated)..."
                        className={`w-full py-3 pl-10 pr-3 ${
                          isDarkMode
                            ? "bg-[#253355] border-[#2d3e5f]"
                            : "bg-[#334366] border-[#405580]"
                        } border-2 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#FFD15C]`}
                      />
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                        <i className="fa-solid fa-magnifying-glass text-gray-400"></i>
                      </div>
                      {searchInput && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <button onClick={clearSearch}>
                            <i className="fa-solid fa-xmark text-gray-400 hover:text-white"></i>
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleSearchClick}
                      disabled={loading}
                      className="px-6 py-3 bg-[#FFD15C] hover:bg-[#FFB81C] text-[#192339] font-bold rounded-lg whitespace-nowrap">
                      {loading ? (
                        <span className="flex items-center">
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Searching...
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <i className="fa-solid fa-magnifying-glass mr-2"></i>
                          Search Recipes
                        </span>
                      )}
                    </button>
                  </div>

                  <p className="text-sm text-gray-300 mt-3">
                    {remainingSearches}/{maxSearches} searches remaining
                  </p>
                </div>

                {/* Selected Ingredients Pills */}
                {selectedIngredients.length > 0 && (
                  <div
                    className={`${
                      isDarkMode ? "bg-[#192339]" : "bg-[#2A3B5C]"
                    } rounded-xl p-4 mb-6 shadow-lg`}>
                    <div className="flex flex-wrap gap-2">
                      {selectedIngredients.map((ingredient) => (
                        <div
                          key={ingredient}
                          className="bg-[#FFD15C] text-[#192339] font-medium px-3 py-1.5 rounded-full text-sm flex items-center cursor-pointer hover:bg-[#FFB81C]"
                          onClick={() => toggleIngredient(ingredient)}>
                          <span>{ingredient}</span>
                          <i className="fa-solid fa-xmark ml-2 w-4 h-4"></i>
                        </div>
                      ))}
                      <button
                        onClick={handleClearAll}
                        className="bg-red-600 text-white px-3 py-1.5 rounded-full text-sm flex items-center hover:bg-red-500">
                        <span>Clear All</span>
                        <i className="fa-solid fa-xmark ml-2 w-4 h-4"></i>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Common Ingredients Section */}
              <div className="px-8 pb-4">
                {/* Common Ingredients Header */}
                <div
                  className={`${
                    isDarkMode ? "bg-[#192339]" : "bg-[#2A3B5C]"
                  } rounded-xl overflow-hidden shadow-lg mb-4`}>
                  <div
                    className="flex justify-between items-center px-5 py-4 cursor-pointer"
                    onClick={() =>
                      setExpandedCategory(expandedCategory ? null : "all")
                    }>
                    <h2 className="text-xl font-semibold text-white">
                      Common Ingredients
                    </h2>
                    <i className="fa-solid fa-bars text-white/80 h-6 w-6"></i>
                  </div>
                </div>

                {/* Category content - only shown when expanded */}
                {expandedCategory === "all" && (
                  <div
                    className={`${
                      isDarkMode ? "bg-[#192339]" : "bg-[#2A3B5C]"
                    } rounded-xl p-5 mb-4 shadow-lg`}>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      {Object.entries(INGREDIENT_CATEGORIES).map(
                        ([key, category]) => (
                          <div
                            key={key}
                            className={`${
                              isDarkMode ? "bg-[#253355]" : "bg-[#334366]"
                            } rounded-lg p-4 border ${
                              isDarkMode
                                ? "border-[#2A3B5C]/30"
                                : "border-[#405580]/30"
                            }`}>
                            <div className="flex items-center mb-3">
                              <category.icon className="w-5 h-5 mr-2 text-[#FFD15C]" />
                              <span className="text-white font-medium">
                                {category.name}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-1.5">
                              {category.items.slice(0, 6).map((item) => (
                                <div
                                  key={item}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleIngredient(item);
                                  }}
                                  className={`text-sm px-2 py-1.5 rounded cursor-pointer ${
                                    selectedIngredients.includes(item)
                                      ? "bg-[#FFD15C] text-[#192339] font-medium"
                                      : "text-gray-300 hover:bg-[#334366]"
                                  }`}>
                                  {item}
                                </div>
                              ))}
                              {category.items.length > 6 && (
                                <div className="text-xs text-[#FFD15C] mt-1">
                                  +{category.items.length - 6} more
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Search Results Section */}
                {showResults && !loading && searchResults.length > 0 && (
                  <div
                    className={`${
                      isDarkMode ? "bg-[#192339]" : "bg-[#2A3B5C]"
                    } rounded-xl p-6 mb-4 shadow-lg`}>
                    <div
                      className={`flex justify-between items-center mb-4 border-b ${
                        isDarkMode ? "border-[#2A3B5C]" : "border-[#405580]"
                      } pb-3`}>
                      <h2 className="text-2xl font-semibold text-white">
                        Search Results
                      </h2>
                      <span className="text-sm text-gray-300">
                        {searchResults.length} recipes found
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                      {searchResults.map((recipe) => (
                        <RecipeCard
                          key={recipe._id}
                          recipe={recipe}
                          onClick={() => openRecipeModal(recipe)}
                          onToggleFavorite={(e) =>
                            handleToggleFavorite(e, recipe._id, recipe)
                          }
                          isFavorite={isFavorite(recipe._id)}
                          className="bg-white border border-[#2A3B5C]/30 shadow-lg hover:border-[#2A3B5C]"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Loading spinner */}
                {loading && (
                  <div
                    className={`${
                      isDarkMode ? "bg-[#192339]" : "bg-[#2A3B5C]"
                    } rounded-xl p-8 mb-4 shadow-lg flex justify-center`}>
                    <div className="w-12 h-12 border-t-4 border-b-4 border-[#FFD15C] rounded-full animate-spin"></div>
                  </div>
                )}

                {/* No results message */}
                {showResults && !loading && searchResults.length === 0 && (
                  <div
                    className={`${
                      isDarkMode ? "bg-[#192339]" : "bg-[#2A3B5C]"
                    } rounded-xl p-8 mb-4 shadow-lg text-center`}>
                    <p className="text-lg mb-2 text-white">No recipes found</p>
                    <p className="text-sm text-gray-400">
                      Try different ingredients or keywords
                    </p>
                  </div>
                )}

                {/* Error message */}
                {error && (
                  <div className="bg-red-800 rounded-xl p-4 mb-4 border border-red-700 shadow-lg">
                    <p className="flex items-center text-white">
                      <i className="fa-solid fa-triangle-exclamation text-red-500 mr-2"></i>
                      {error}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recipe Modal */}
      <UnifiedRecipeModal
        recipe={selectedRecipe}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onToggleFavorite={(e) =>
          selectedRecipe &&
          handleToggleFavorite(e, selectedRecipe._id, selectedRecipe)
        }
      />
    </div>
  );
};

export default RecipeSearch;
