import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  getUserFavorites,
  toggleFavorite as apiToggleFavorite,
} from "../services/userService";
import { useAuth } from "./AuthContext";
import { showToast } from "@/utils/toast";
import { extractRecipeId, formatRecipeForFavorite } from "../utils/recipeUtils";

const FavoritesContext = createContext();

// Cache duration for favorites - 2 minutes
const FAVORITES_CACHE_DURATION = 2 * 60 * 1000;

// Simple debounce utility
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

export const FavoritesProvider = ({ children }) => {
  const [favoritesSet, setFavoritesSet] = useState(new Set());
  const [favoritesArray, setFavoritesArray] = useState([]);
  const [favoriteFullData, setFavoriteFullData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [favoritesLimits, setFavoritesLimits] = useState({
    current: 0,
    max: 5,
    remaining: 5,
    plan: "Free",
  });
  const { user, isAuthenticated } = useAuth();
  const lastFetchTime = useRef(0);
  const fetchInProgress = useRef(false);
  const cachedFavorites = useRef(null);

  // Debounced API call to toggle favorites
  const toggleFavoriteDebounced = useCallback(
    debounce(async (recipeId, isFavorite, recipeData) => {
      if (!isAuthenticated) {
        showToast("Please log in to save favorites", "info");
        return { success: false, message: "Not authenticated" };
      }

      try {
        const response = await apiToggleFavorite(
          recipeId,
          isFavorite,
          recipeData
        );
        return response;
      } catch (error) {
        return {
          success: false,
          message: error.message || "Error updating favorites",
        };
      }
    }, 500),
    [isAuthenticated]
  );

  // Fetch favorites when user changes
  useEffect(() => {
    if (user && user.id) {
      fetchFavorites();
    } else {
      // Clear favorites when user logs out
      setFavoritesSet(new Set());
      setFavoritesArray([]);
      setFavoriteFullData({});
      setFavoritesLimits({
        current: 0,
        max: 5,
        remaining: 5,
        plan: "Free",
      });
      cachedFavorites.current = null;
    }
  }, [user]);

  const fetchFavorites = async (forceRefresh = false) => {
    if (!user) return;

    // Don't fetch if a request is already in progress
    if (fetchInProgress.current) {
      return;
    }

    // Check if we have cached favorites and if the cache is still valid
    const now = Date.now();
    if (
      !forceRefresh &&
      cachedFavorites.current &&
      now - lastFetchTime.current < FAVORITES_CACHE_DURATION
    ) {
      // Use cached favorites
      setFavoritesSet(cachedFavorites.current.favoritesSet);
      setFavoritesArray(cachedFavorites.current.favoritesArray);
      setFavoriteFullData(cachedFavorites.current.favoriteFullData);
      setFavoritesLimits(cachedFavorites.current.limits);
      return;
    }

    try {
      fetchInProgress.current = true;
      setLoading(true);
      setError(null);

      const response = await getUserFavorites();

      if (response.success) {
        // Process the favorites data
        const newFavoritesArray = response.data || [];

        // Create a Set of recipe IDs for efficient lookup
        const newFavoritesSet = new Set(
          newFavoritesArray.map((recipe) => extractRecipeId(recipe))
        );

        // Create a map of recipe ID to full recipe data
        const newFavoriteFullData = {};
        newFavoritesArray.forEach((recipe) => {
          const id = extractRecipeId(recipe);
          if (id) {
            newFavoriteFullData[id] = recipe;
          }
        });

        // Update state
        setFavoritesSet(newFavoritesSet);
        setFavoritesArray(newFavoritesArray);
        setFavoriteFullData(newFavoriteFullData);

        // Store limits information
        if (response.limits) {
          setFavoritesLimits(response.limits);
        }

        // Cache the response
        cachedFavorites.current = {
          favoritesSet: newFavoritesSet,
          favoritesArray: newFavoritesArray,
          favoriteFullData: newFavoriteFullData,
          limits: response.limits || favoritesLimits,
        };
        lastFetchTime.current = now;
      } else {
        setError(response.message || "Failed to fetch favorites");
        showToast(response.message || "Failed to fetch favorites", "error");
      }
    } catch (error) {
      setError("Error fetching favorites");
      showToast("Failed to fetch your favorites", "error");
    } finally {
      setLoading(false);
      fetchInProgress.current = false;
    }
  };

  const isFavorite = useCallback(
    (recipeOrId) => {
      if (!recipeOrId) return false;

      // Handle string IDs directly
      if (typeof recipeOrId === "string" || typeof recipeOrId === "number") {
        return favoritesSet.has(recipeOrId.toString());
      }

      // Handle recipe objects
      const recipeId = extractRecipeId(recipeOrId);
      return recipeId ? favoritesSet.has(recipeId) : false;
    },
    [favoritesSet]
  );

  const addToFavorites = useCallback(
    (recipeOrId, recipeData = null) => {
      if (!recipeOrId) return;

      // Extract ID and prepare recipe data
      let recipeId;
      let fullRecipeData;

      if (typeof recipeOrId === "string" || typeof recipeOrId === "number") {
        // If just ID provided
        recipeId = recipeOrId.toString();

        // Use the provided recipe data if available, or look it up in existing data
        fullRecipeData = recipeData
          ? formatRecipeForFavorite(recipeData)
          : favoriteFullData[recipeId];

        // If we still don't have recipe data, create minimal object
        if (!fullRecipeData) {
          fullRecipeData = {
            _id: recipeId,
            id: recipeId,
            name: `Recipe ${recipeId}`,
            favoriteTimestamp: Date.now(),
          };
        }
      } else {
        // If full recipe object is provided
        recipeId = extractRecipeId(recipeOrId);
        if (!recipeId) return;

        // Format recipe data consistently
        fullRecipeData = formatRecipeForFavorite(recipeOrId);
      }

      // Update Set state
      const newFavoritesSet = new Set(favoritesSet);
      newFavoritesSet.add(recipeId);
      setFavoritesSet(newFavoritesSet);

      // Update Array state (add at beginning)
      const newFavoritesArray = [
        fullRecipeData,
        ...favoritesArray.filter((r) => extractRecipeId(r) !== recipeId),
      ];
      setFavoritesArray(newFavoritesArray);

      // Update full data map
      setFavoriteFullData((prev) => ({
        ...prev,
        [recipeId]: fullRecipeData,
      }));

      // Update limits optimistically
      setFavoritesLimits((prev) => ({
        ...prev,
        current: Math.min(prev.current + 1, prev.max),
        remaining: Math.max(prev.remaining - 1, 0),
      }));

      // Update cache
      if (cachedFavorites.current) {
        cachedFavorites.current = {
          favoritesSet: newFavoritesSet,
          favoritesArray: newFavoritesArray,
          favoriteFullData: {
            ...cachedFavorites.current.favoriteFullData,
            [recipeId]: fullRecipeData,
          },
          limits: {
            ...cachedFavorites.current.limits,
            current: Math.min(
              cachedFavorites.current.limits.current + 1,
              cachedFavorites.current.limits.max
            ),
            remaining: Math.max(
              cachedFavorites.current.limits.remaining - 1,
              0
            ),
          },
        };
      }
    },
    [favoritesSet, favoritesArray, favoriteFullData]
  );

  const removeFromFavorites = useCallback(
    (recipeOrId) => {
      if (!recipeOrId) return;

      // Extract the recipe ID
      const recipeId =
        typeof recipeOrId === "string" || typeof recipeOrId === "number"
          ? recipeOrId.toString()
          : extractRecipeId(recipeOrId);

      if (!recipeId) return;

      // Update Set state
      const newFavoritesSet = new Set(favoritesSet);
      newFavoritesSet.delete(recipeId);
      setFavoritesSet(newFavoritesSet);

      // Update Array state
      const newFavoritesArray = favoritesArray.filter(
        (recipe) => extractRecipeId(recipe) !== recipeId
      );
      setFavoritesArray(newFavoritesArray);

      // Update full data map (preserve the data for potential undo operations)
      const newFavoriteFullData = { ...favoriteFullData };
      // We don't delete, just mark as removed in case we need to restore
      if (newFavoriteFullData[recipeId]) {
        newFavoriteFullData[recipeId]._removed = true;
      }
      setFavoriteFullData(newFavoriteFullData);

      // Update limits optimistically
      setFavoritesLimits((prev) => ({
        ...prev,
        current: Math.max(prev.current - 1, 0),
        remaining: Math.min(prev.remaining + 1, prev.max),
      }));

      // Update cache
      if (cachedFavorites.current) {
        cachedFavorites.current = {
          favoritesSet: newFavoritesSet,
          favoritesArray: newFavoritesArray,
          favoriteFullData: newFavoriteFullData,
          limits: {
            ...cachedFavorites.current.limits,
            current: Math.max(cachedFavorites.current.limits.current - 1, 0),
            remaining: Math.min(
              cachedFavorites.current.limits.remaining + 1,
              cachedFavorites.current.limits.max
            ),
          },
        };
      }
    },
    [favoritesSet, favoritesArray, favoriteFullData]
  );

  // Combined toggle function that handles API calls
  const toggleFavorite = useCallback(
    async (recipeOrId, recipeData = null) => {
      if (!isAuthenticated) {
        showToast("Please log in to save favorites", "info");
        return;
      }

      try {
        // Extract recipe ID and determine current favorite state
        let recipeId;
        let recipe;

        if (typeof recipeOrId === "string" || typeof recipeOrId === "number") {
          recipeId = recipeOrId.toString();
          recipe = recipeData || favoriteFullData[recipeId];
        } else {
          recipe = recipeOrId;
          recipeId = extractRecipeId(recipe);
        }

        if (!recipeId) {
          showToast("Invalid recipe data", "error");
          return;
        }

        const currentlyFavorite = isFavorite(recipeId);

        // Optimistically update UI
        if (currentlyFavorite) {
          removeFromFavorites(recipeId);
        } else {
          addToFavorites(recipeId, recipe);
        }

        // Format recipe data for API
        // Special handling for AI recipes to ensure all required data is included
        const isAIRecipe =
          recipe?.source === "ai" || recipe?.sourceType === "ai";

        let formattedRecipe;
        if (isAIRecipe) {
          // For AI recipes, ensure all required fields are present
          formattedRecipe = {
            ...formatRecipeForFavorite(recipe),
            source: "ai",
            sourceType: "ai",
            _id: recipeId,
            id: recipeId,
          };
        } else {
          formattedRecipe = recipe ? formatRecipeForFavorite(recipe) : null;
        }

        // Make API call
        const response = await toggleFavoriteDebounced(
          recipeId,
          !currentlyFavorite,
          !currentlyFavorite ? formattedRecipe : null
        );

        // Handle response
        if (response && response.success === false) {
          // Revert optimistic update on error
          if (currentlyFavorite) {
            addToFavorites(recipeId, recipe);
          } else {
            removeFromFavorites(recipeId);
          }

          // Special handling for limit reached error
          if (response.limitReached) {
            showToast(`${response.message}`, "error");
            // Refresh favorites to ensure we have the latest limits
            fetchFavorites(true);
          } else {
            showToast(
              response.message || "Failed to update favorites",
              "error"
            );
          }
        } else {
          // Show success message for successful operations
          showToast(
            currentlyFavorite ? "Removed from favorites" : "Added to favorites",
            "success"
          );
          // Refresh favorites to update limits info
          fetchFavorites(true);
        }
      } catch (error) {
        showToast("An error occurred while updating favorites", "error");
        // Refresh to get consistent state
        fetchFavorites(true);
      }
    },
    [
      isAuthenticated,
      addToFavorites,
      removeFromFavorites,
      isFavorite,
      favoriteFullData,
      toggleFavoriteDebounced,
    ]
  );

  const value = {
    // Data
    favorites: favoritesArray, // For backward compatibility
    favoritesSet,
    favoritesArray,
    favoriteFullData,
    loading,
    error,
    favoritesLimits,

    // Methods
    isFavorite,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    fetchFavorites,
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
};

export default FavoritesContext;
