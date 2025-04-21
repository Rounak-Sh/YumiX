import React, { useState, useEffect } from "react";
import { getTrendingRecipes } from "../services/recipeService";
import { motion } from "framer-motion";
import { FireIcon, ChartBarIcon } from "@heroicons/react/24/outline";
import { showToast } from "@/utils/toast";
import { UnifiedRecipeModal, RecipeCard } from "../components";

const Trending = () => {
  const [trendingRecipes, setTrendingRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [limit, setLimit] = useState(5);
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  // Set window.showRecipeModal for compatibility
  useEffect(() => {
    const originalShowRecipeModal = window.showRecipeModal;

    window.showRecipeModal = (recipe) => {
      setSelectedRecipe(recipe);
    };

    return () => {
      window.showRecipeModal = originalShowRecipeModal;
    };
  }, []);

  useEffect(() => {
    fetchTrendingRecipes();
  }, []);

  const fetchTrendingRecipes = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getTrendingRecipes(5); // Get top 5 trending recipes
      console.log("Trending response:", response);

      if (response.success) {
        setTrendingRecipes(response.data);
      } else {
        setError(response.message || "Failed to load trending recipes");
        showToast.error(response.message || "Failed to load trending recipes");
      }
    } catch (error) {
      console.error("Error fetching trending recipes:", error);
      setError("Failed to load trending recipes");
      showToast.error("Failed to load trending recipes");
    } finally {
      setLoading(false);
    }
  };

  const handleViewRecipe = (recipe) => {
    setSelectedRecipe(recipe);
  };

  const closeRecipeModal = () => {
    setSelectedRecipe(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFCF50]"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center">
          <span className="border-b-4 border-[#FFCF50] pb-1">
            Top 5 Trending Recipes
          </span>
          <FireIcon className="w-6 h-6 ml-2 text-[#FFCF50]" />
        </h1>
      </div>

      {error ? (
        <div className="bg-red-500/10 rounded-xl p-6 text-center">
          <p className="text-red-500 text-lg">{error}</p>
          <button
            onClick={fetchTrendingRecipes}
            className="mt-4 px-4 py-2 bg-[#FFCF50] text-[#23486A] rounded-lg flex items-center gap-2 mx-auto">
            Try Again
          </button>
        </div>
      ) : trendingRecipes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trendingRecipes.map((recipe, index) => (
            <motion.div
              key={recipe._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}>
              <RecipeCard
                recipe={{
                  ...recipe,
                  // Add trending rank for display
                  rank: index + 1,
                }}
                onClick={() => handleViewRecipe(recipe)}
              />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-white/10 rounded-xl p-10 text-center">
          <FireIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-white text-lg mb-4">
            No trending recipes available at the moment.
          </p>
        </div>
      )}

      {loading && trendingRecipes.length > 0 && (
        <div className="flex justify-center mt-6">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#FFCF50]"></div>
        </div>
      )}

      {/* Recipe Modal */}
      <UnifiedRecipeModal
        recipe={selectedRecipe}
        isOpen={!!selectedRecipe}
        onClose={closeRecipeModal}
      />
    </div>
  );
};

export default Trending;
