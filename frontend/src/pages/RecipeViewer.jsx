import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getRecipeById } from "../services/recipeService";
import { UnifiedRecipeModal } from "../components";
import { useFavorites } from "../context/FavoritesContext";
import { useAuth } from "../context/AuthContext";
import { showToast } from "../utils/toast";
import LoadingSpinner from "../components/LoadingSpinner";

/**
 * RecipeViewer component
 *
 * This component handles the /recipe/:recipeId route and displays
 * recipe details in a modal. If it can't find the recipe, it navigates back.
 */
const RecipeViewer = () => {
  const { recipeId } = useParams();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { toggleFavorite } = useFavorites();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      window.skipHistoryTracking = true;
      console.log("Setting skipHistoryTracking flag: user not authenticated");
    }

    return () => {
      if (!isAuthenticated) {
        window.skipHistoryTracking = false;
      }
    };
  }, [isAuthenticated]);

  useEffect(() => {
    const fetchRecipe = async () => {
      if (!recipeId) {
        navigate("/");
        return;
      }

      try {
        setLoading(true);
        const response = await getRecipeById(recipeId);

        if (response.success === false) {
          setError(response.message || "Recipe not found");
          showToast.error("Recipe not found");
          setTimeout(() => navigate("/"), 2000);
          return;
        }

        setRecipe(response.data);
      } catch (error) {
        console.error("Error fetching recipe:", error);
        setError("Failed to fetch recipe details");
        showToast.error("Failed to fetch recipe details");
        setTimeout(() => navigate("/"), 2000);
      } finally {
        setLoading(false);
      }
    };

    fetchRecipe();
  }, [recipeId, navigate]);

  const handleToggleFavorite = async (e, recipe) => {
    if (!isAuthenticated) {
      showToast.error("Please log in to save favorites");
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    try {
      await toggleFavorite(recipe._id, recipe);
    } catch (error) {
      console.error("Error toggling favorite:", error);
      showToast.error("Failed to update favorites");
    }
  };

  const handleCloseModal = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <p className="text-gray-500">Redirecting to home...</p>
        </div>
      </div>
    );
  }

  return (
    <UnifiedRecipeModal
      recipe={recipe}
      isOpen={!!recipe}
      onClose={handleCloseModal}
      onToggleFavorite={handleToggleFavorite}
    />
  );
};

export default RecipeViewer;
