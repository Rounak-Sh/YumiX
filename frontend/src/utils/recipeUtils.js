/**
 * Recipe Utility Functions
 * Standard utilities for working with recipes across the application
 */

/**
 * Extract a consistent recipe ID from any recipe object
 * @param {Object} recipe - The recipe object
 * @param {string} fallbackPrefix - Optional prefix for generated IDs (default: 'recipe')
 * @returns {string} Standardized recipe ID
 */
export const extractRecipeId = (recipe, fallbackPrefix = "recipe") => {
  if (!recipe) return null;

  // Try to extract ID in priority order
  const id =
    // MongoDB style ID
    (recipe._id ? recipe._id.toString() : null) ||
    // Regular ID field
    (recipe.id ? recipe.id.toString() : null) ||
    // Specific recipe ID field
    (recipe.recipeId ? recipe.recipeId.toString() : null) ||
    // External source ID
    (recipe.sourceId ? recipe.sourceId.toString() : null);

  // If we found an ID, return it
  if (id) return id;

  // Generate a fallback ID based on recipe properties
  if (recipe.source === "ai" || recipe.sourceType === "ai") {
    // For AI recipes, use name if available
    if (recipe.name) {
      const nameSlug = recipe.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      // Remove timestamp to ensure stable IDs for AI recipes
      return `ai-${nameSlug}`;
    }
    return `ai-generic-recipe`;
  }

  // For spoonacular recipes, ensure consistent format
  if (
    (recipe.source === "spoonacular" || recipe.sourceType === "spoonacular") &&
    recipe.sourceId
  ) {
    return `spoonacular-${recipe.sourceId}`;
  }

  // Last resort fallback with timestamp
  return `${fallbackPrefix}-${Date.now()}`;
};

/**
 * Format a recipe object for consistent storage in favorites
 * @param {Object} recipe - The recipe object to format
 * @returns {Object} Formatted recipe object
 */
export const formatRecipeForFavorite = (recipe) => {
  if (!recipe) return null;

  // Extract a consistent ID
  const recipeId = extractRecipeId(recipe);

  // Create a standardized recipe object with all essential fields
  return {
    _id: recipeId,
    id: recipeId, // Store as both formats for compatibility
    name: recipe.name || recipe.title || recipe.recipeName || "Unnamed Recipe",
    image: recipe.image || null,
    prepTime: recipe.prepTime || recipe.readyInMinutes || 30,
    sourceType: recipe.sourceType || recipe.source || "unknown",
    source: recipe.sourceType || recipe.source || "unknown",
    sourceId: recipe.sourceId || null,
    servings: recipe.servings || 4,
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
    instructions: recipe.instructions || recipe.steps || "",
    // Additional fields that are useful to preserve
    cuisine: recipe.cuisine || null,
    dietType: recipe.dietType || recipe.diets || [],
    difficulty: recipe.difficulty || "medium",
    // Store original fields to help with debugging
    originalId:
      recipe._id || recipe.id || recipe.recipeId || recipe.sourceId || null,
    favoriteTimestamp: Date.now(),
  };
};

/**
 * Deep compare two recipe objects to check if they represent the same recipe
 * @param {Object} recipe1 - First recipe
 * @param {Object} recipe2 - Second recipe
 * @returns {boolean} True if recipes are equivalent
 */
export const areRecipesEquivalent = (recipe1, recipe2) => {
  if (!recipe1 || !recipe2) return false;

  // Compare IDs first
  const id1 = extractRecipeId(recipe1);
  const id2 = extractRecipeId(recipe2);

  if (id1 && id2 && id1 === id2) return true;

  // If IDs don't match, check source IDs
  if (
    recipe1.sourceId &&
    recipe2.sourceId &&
    recipe1.sourceId.toString() === recipe2.sourceId.toString() &&
    recipe1.sourceType === recipe2.sourceType
  ) {
    return true;
  }

  // For AI recipes, check if name and ingredients match
  if (
    recipe1.source === "ai" &&
    recipe2.source === "ai" &&
    recipe1.name === recipe2.name
  ) {
    return true;
  }

  return false;
};

/**
 * Create a debug string for a recipe to help with troubleshooting
 * @param {Object} recipe - The recipe object
 * @returns {string} Debug information
 */
export const getRecipeDebugInfo = (recipe) => {
  if (!recipe) return "Recipe is null or undefined";

  return (
    `Recipe: ${recipe.name || "Unnamed"}\n` +
    `ID Extraction: ${extractRecipeId(recipe)}\n` +
    `Original ID fields: _id=${recipe._id}, id=${recipe.id}, recipeId=${recipe.recipeId}, sourceId=${recipe.sourceId}\n` +
    `Source: ${recipe.sourceType || recipe.source || "unknown"}\n` +
    `Has image: ${Boolean(recipe.image)}\n` +
    `Fields: ${Object.keys(recipe).join(", ")}`
  );
};
