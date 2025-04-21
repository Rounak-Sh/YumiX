import React, { useState } from "react";
import { useFavorites } from "../context/FavoritesContext";
import { extractRecipeId, getRecipeDebugInfo } from "../utils/recipeUtils";

/**
 * Debugging tool for favorites functionality
 * Only for development use
 */
const FavoritesDebugger = ({ className = "" }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const {
    favoritesArray,
    favoritesSet,
    favoriteFullData,
    isFavorite,
    logFavoritesState,
  } = useFavorites();

  // Toggle expanded state
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded) {
      // Log to console when expanding
      logFavoritesState();
    }
  };

  // Show additional details for a recipe
  const showRecipeDetails = (recipe) => {
    setSelectedRecipe(recipe);
  };

  if (process.env.NODE_ENV === "production") {
    return null; // Don't render in production
  }

  return (
    <div
      className={`bg-gray-100 border border-gray-300 rounded-lg overflow-hidden ${className}`}>
      <div
        className="bg-gray-200 px-4 py-2 cursor-pointer flex justify-between items-center"
        onClick={toggleExpanded}>
        <h3 className="font-medium text-gray-700">Favorites Debugger</h3>
        <span>{isExpanded ? "▼" : "►"}</span>
      </div>

      {isExpanded && (
        <div className="p-4">
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-white p-2 rounded border border-gray-200">
              <p className="text-sm font-semibold">Favorites Set</p>
              <p className="text-xs">Size: {favoritesSet.size}</p>
            </div>
            <div className="bg-white p-2 rounded border border-gray-200">
              <p className="text-sm font-semibold">Favorites Array</p>
              <p className="text-xs">Length: {favoritesArray.length}</p>
            </div>
          </div>

          <div className="mb-4">
            <h4 className="text-sm font-semibold mb-2">Favorited Recipes:</h4>
            <div className="max-h-40 overflow-y-auto">
              {favoritesArray.length === 0 ? (
                <p className="text-sm text-gray-500">No favorites yet</p>
              ) : (
                <ul className="text-xs space-y-1">
                  {favoritesArray.map((recipe) => {
                    const id = extractRecipeId(recipe);
                    return (
                      <li
                        key={id}
                        className="cursor-pointer hover:bg-gray-100 p-1 rounded flex justify-between"
                        onClick={() => showRecipeDetails(recipe)}>
                        <span>
                          {recipe.name || "Unnamed"}
                          <span className="text-gray-500"> ({id})</span>
                        </span>
                        <span className="text-blue-500">Details</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {selectedRecipe && (
            <div className="mb-4 border border-gray-200 rounded p-2">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-semibold">Recipe Details</h4>
                <button
                  className="text-xs text-gray-500"
                  onClick={() => setSelectedRecipe(null)}>
                  Close
                </button>
              </div>
              <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                {getRecipeDebugInfo(selectedRecipe)}
              </pre>
              <div className="mt-2 text-xs">
                <div className="flex justify-between">
                  <span>ID: {extractRecipeId(selectedRecipe)}</span>
                  <span
                    className={
                      isFavorite(selectedRecipe)
                        ? "text-green-500"
                        : "text-red-500"
                    }>
                    {isFavorite(selectedRecipe)
                      ? "In Favorites ✓"
                      : "Not in Favorites ✗"}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <button
              className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
              onClick={logFavoritesState}>
              Log to Console
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FavoritesDebugger;
