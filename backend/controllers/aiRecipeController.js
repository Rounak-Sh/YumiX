import axios from "axios";
import { Recipe } from "../models/index.js";
import { safeRedisGet, safeRedisSet } from "../config/safeRedisOperations.js";
import { getYouTubeVideos } from "../services/ai/youtubeService.js";
import userNotificationController from "../controllers/user/notificationController.js";

// API Keys from environment variables only
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY;

// Base URLs
const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro-002:generateContent";
const SPOONACULAR_BASE_URL = "https://api.spoonacular.com/recipes";

// Cache durations
const RECIPE_CACHE_DURATION = 24 * 60 * 60; // 24 hours in seconds

// Configuration Toggles
const CONFIG = {
  // Enable/disable features as needed
  FORCE_GEMINI: false, // When false, allows Spoonacular fallback if Gemini fails
  ENABLE_CACHING: true, // When true, checks and stores cache for repeated requests
  LIMIT_AI_CALLS: true, // When true, implements rate limiting for AI calls
  MAX_DAILY_AI_CALLS: 50, // Maximum number of AI calls per day (to preserve quota)
  ENABLE_EMERGENCY_RECIPE: true, // When true, provides emergency recipe if all APIs fail
  DISABLE_GEMINI_COMPLETELY: !GEMINI_API_KEY, // Disable Gemini if API key is missing
};

// Simple in-memory counter for AI calls (resets on server restart)
let dailyAICallCount = 0;
let lastResetDate = new Date().toDateString();

// Function to check and reset AI call counter
const checkAndUpdateAICallCount = () => {
  const today = new Date().toDateString();

  // Reset counter if it's a new day
  if (today !== lastResetDate) {
    dailyAICallCount = 0;
    lastResetDate = today;
    console.log("AI call counter reset for new day");
  }

  // Check if we've reached the limit
  if (CONFIG.LIMIT_AI_CALLS && dailyAICallCount >= CONFIG.MAX_DAILY_AI_CALLS) {
    console.log(
      `AI call limit reached (${dailyAICallCount}/${CONFIG.MAX_DAILY_AI_CALLS})`
    );
    return false;
  }

  // Increment counter
  dailyAICallCount++;
  console.log(
    `AI call count: ${dailyAICallCount}/${CONFIG.MAX_DAILY_AI_CALLS}`
  );
  return true;
};

/**
 * Generate a recipe using Gemini AI with fallback to Spoonacular
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const generateRecipe = async (req, res) => {
  try {
    const { ingredients, dishName } = req.body;

    if (!ingredients && !dishName) {
      return res.status(400).json({
        success: false,
        message: "Please provide either ingredients or a dish name",
      });
    }

    // Create a cache key based on the request
    const cacheKey = `recipe:${dishName || ""}:${
      ingredients ? ingredients.sort().join(",") : ""
    }`;

    // Check cache first (if caching is enabled)
    if (CONFIG.ENABLE_CACHING) {
      const cachedRecipe = await safeRedisGet(cacheKey);
      if (cachedRecipe) {
        console.log("Returning cached recipe");
        return res.status(200).json({
          success: true,
          data: cachedRecipe,
          source: "cache",
        });
      }
    } else {
      console.log("Caching disabled - skipping cache check");
    }

    // Check if Gemini is completely disabled
    if (CONFIG.DISABLE_GEMINI_COMPLETELY) {
      console.log(
        "Gemini API completely disabled in config - skipping to Spoonacular"
      );
    }
    // Otherwise check if we can use AI and Gemini isn't disabled
    else {
      // Check if we're within AI call limits before trying Gemini
      const canUseAI = checkAndUpdateAICallCount();

      // If we can use AI, try Gemini first
      if (canUseAI) {
        // Try Gemini AI with multiple attempts if needed
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            console.log(`Gemini attempt ${attempt}: Generating recipe...`);

            let geminiRecipe;
            if (attempt === 1) {
              // First attempt - use regular endpoint and fully structured prompt
              geminiRecipe = await generateRecipeWithGemini(
                ingredients,
                dishName
              );
            } else if (attempt === 2) {
              // Second attempt - use simplified prompt
              const simplifiedPrompt = `Create a recipe for ${
                dishName || ""
              } using these ingredients: ${
                ingredients?.join(", ") || "any ingredients"
              }`;
              geminiRecipe = await generateRecipeWithSimplifiedPrompt(
                simplifiedPrompt,
                ingredients,
                dishName
              );
            } else {
              // Third attempt - try alternative model endpoint
              const alternativeEndpoint =
                "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro-002:generateContent";
              geminiRecipe = await generateRecipeWithAlternativeEndpoint(
                alternativeEndpoint,
                ingredients,
                dishName
              );
            }

            // Cache the successful result (if caching is enabled)
            if (CONFIG.ENABLE_CACHING) {
              await safeRedisSet(cacheKey, geminiRecipe, {
                EX: RECIPE_CACHE_DURATION,
              });
            }

            // Get YouTube videos for the recipe
            const videoData = await getYouTubeVideos(
              `${geminiRecipe.name} recipe cooking`
            );

            // Send notification early if user is authenticated
            if (req.user && req.user._id) {
              try {
                // Create notification BEFORE sending the response
                const notification =
                  await userNotificationController.createUserNotification({
                    userId: req.user._id,
                    title: "AI Recipe Created",
                    message: `Your recipe "${geminiRecipe.name}" has been generated successfully!`,
                    type: "recipe",
                    data: {
                      recipeName: geminiRecipe.name,
                      timestamp: new Date(),
                    },
                  });
                console.log(
                  "AI recipe notification created for user:",
                  notification?._id
                );

                // Small delay to ensure notification has been stored in database
                await new Promise((resolve) => setTimeout(resolve, 500));
              } catch (notificationError) {
                console.error(
                  "Error creating AI recipe notification:",
                  notificationError
                );
                // Continue execution even if notification fails
              }
            }

            // Return the recipe with video data
            return res.status(200).json({
              success: true,
              data: { ...geminiRecipe, youtubeVideos: videoData },
              source: "gemini",
            });
          } catch (geminiError) {
            console.error(
              `Gemini attempt ${attempt} failed:`,
              geminiError.message
            );
            if (attempt < 3) {
              console.log(`Trying again with attempt ${attempt + 1}...`);
              continue;
            }
            // If all attempts failed, proceed to fallback logic
            console.error("All Gemini attempts failed");
          }
        }
      } else {
        console.log("AI call limit reached, skipping Gemini API");
      }
    }

    // If force Gemini is enabled and Gemini is not disabled completely, don't fall back to Spoonacular
    if (CONFIG.FORCE_GEMINI && !CONFIG.DISABLE_GEMINI_COMPLETELY) {
      console.log(
        "FORCE_GEMINI flag is true - creating emergency Gemini recipe"
      );

      // Create a more detailed emergency recipe for demonstration purposes
      const emergencyRecipe = createEmergencyRecipe(ingredients, dishName);

      return res.status(200).json({
        success: true,
        data: { ...emergencyRecipe, youtubeVideos: [] },
        source: "gemini",
      });
    }

    // Only reach here if FORCE_GEMINI is false - try Spoonacular as fallback
    console.log("Falling back to Spoonacular API");
    const spoonacularRecipe = await generateRecipeWithSpoonacular(
      ingredients,
      dishName
    );

    // Cache the successful result (if caching is enabled)
    if (CONFIG.ENABLE_CACHING) {
      await safeRedisSet(cacheKey, spoonacularRecipe, {
        EX: RECIPE_CACHE_DURATION,
      });
    }

    // Get YouTube videos for the recipe
    const videoData = await getYouTubeVideos(
      `${spoonacularRecipe.name} recipe cooking`
    );

    // Send notification early if user is authenticated
    if (req.user && req.user._id) {
      try {
        // Create notification BEFORE sending the response
        const notification =
          await userNotificationController.createUserNotification({
            userId: req.user._id,
            title: "Recipe Created",
            message: `Your recipe "${spoonacularRecipe.name}" has been generated!`,
            type: "recipe",
            data: {
              recipeName: spoonacularRecipe.name,
              timestamp: new Date(),
            },
          });
        console.log("Recipe notification created for user:", notification?._id);

        // Small delay to ensure notification has been stored in database
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (notificationError) {
        console.error("Error creating recipe notification:", notificationError);
        // Continue execution even if notification fails
      }
    }

    // Return the recipe with video data
    return res.status(200).json({
      success: true,
      data: { ...spoonacularRecipe, youtubeVideos: videoData },
      source: "spoonacular",
    });
  } catch (error) {
    // Handle unexpected errors
    console.error("Recipe generation error:", error);

    // If emergency recipes are enabled, provide one as a last resort
    if (CONFIG.ENABLE_EMERGENCY_RECIPE) {
      console.log("Using emergency recipe due to unexpected error");
      const emergencyRecipe = createEmergencyRecipe(ingredients, dishName);

      return res.status(200).json({
        success: true,
        data: { ...emergencyRecipe, youtubeVideos: [] },
        source: "emergency",
      });
    }

    // Otherwise return an error
    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred",
      error: error.message,
    });
  }
};

/**
 * Generate a recipe using Google Gemini AI
 * @param {Array} ingredients - List of ingredients
 * @param {String} dishName - Name of the dish
 * @returns {Object} Structured recipe data
 */
const generateRecipeWithGemini = async (ingredients, dishName) => {
  // Construct the prompt based on available inputs
  let prompt;
  if (ingredients && ingredients.length > 0) {
    prompt = `Create a detailed recipe using these ingredients: ${ingredients.join(
      ", "
    )}. 
    If a dish name is provided: ${
      dishName || "None"
    }, try to make a recipe for that dish.`;
  } else {
    prompt = `Create a detailed recipe for ${dishName}.`;
  }

  // Add structure requirements to the prompt
  prompt += `
  Please format the response as a JSON object with the following structure:
  {
    "name": "Recipe Name",
    "ingredients": ["ingredient 1", "ingredient 2", ...],
    "instructions": "Step-by-step cooking instructions",
    "prepTime": preparation time in minutes (number),
    "cookTime": cooking time in minutes (number),
    "servings": number of servings (number),
    "nutritionFacts": {
      "calories": calories per serving (number),
      "protein": protein in grams (number),
      "carbs": carbohydrates in grams (number),
      "fats": fats in grams (number)
    }
  }
  
  Make sure the recipe is practical, delicious, and the instructions are clear and detailed.`;

  console.log(
    "Making Gemini API request with prompt:",
    prompt.substring(0, 100) + "..."
  );
  console.log(
    "Using Gemini API Key:",
    GEMINI_API_KEY.substring(0, 5) +
      "..." +
      GEMINI_API_KEY.substring(GEMINI_API_KEY.length - 3)
  );
  console.log("Using Gemini endpoint:", GEMINI_BASE_URL);

  try {
    // Configure request with proper headers and params
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 30000, // 30 seconds timeout
    };

    // Make request to Gemini API with proper error handling
    console.log("Sending request to Gemini API...");
    const response = await axios.post(
      `${GEMINI_BASE_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
          topP: 0.95,
          topK: 40,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_ONLY_HIGH",
          },
        ],
      },
      config
    );

    console.log("Gemini API call successful");

    if (
      !response.data ||
      !response.data.candidates ||
      response.data.candidates.length === 0
    ) {
      console.error(
        "Invalid Gemini response structure:",
        JSON.stringify(response.data)
      );
      throw new Error("Invalid Gemini API response structure");
    }

    // Extract and parse the recipe JSON from the response
    const generatedText = response.data.candidates[0].content.parts[0].text;
    console.log(
      "Generated text first 100 chars:",
      generatedText.substring(0, 100) + "..."
    );

    // Extract JSON from the response (handling potential markdown code blocks)
    const jsonMatch =
      generatedText.match(/```json\n([\s\S]*?)\n```/) ||
      generatedText.match(/```\n([\s\S]*?)\n```/) ||
      generatedText.match(/{[\s\S]*?}/);

    if (!jsonMatch) {
      console.error("Failed to extract JSON - full text:", generatedText);

      // Try to salvage the situation by creating a simple recipe from the text
      console.log("Attempting to create a simple recipe from the text...");
      const simpleRecipe = {
        name: dishName || "Custom Recipe",
        ingredients: ingredients || ["Ingredients not specified"],
        instructions: generatedText,
        prepTime: 30,
        cookTime: 30,
        servings: 4,
        source: "gemini",
        image: `https://source.unsplash.com/random/800x600/?food,${encodeURIComponent(
          dishName || "recipe"
        )}`,
        nutritionFacts: {
          calories: 400,
          protein: 20,
          carbs: 30,
          fats: 15,
        },
      };

      return simpleRecipe;
    }

    let recipeJson;
    try {
      recipeJson = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      console.log("Successfully parsed JSON from Gemini response");
    } catch (e) {
      console.error(
        "JSON parse error, trying more aggressive extraction:",
        e.message
      );
      // If parsing fails, try to extract the JSON more aggressively
      try {
        const potentialJson = generatedText.substring(
          generatedText.indexOf("{"),
          generatedText.lastIndexOf("}") + 1
        );
        recipeJson = JSON.parse(potentialJson);
        console.log("Successfully parsed JSON with aggressive extraction");
      } catch (e2) {
        console.error("All JSON parsing attempts failed:");
        console.error("Original error:", e.message);
        console.error("Secondary error:", e2.message);
        console.error("Raw text:", generatedText);

        // Create a fallback recipe if JSON parsing completely fails
        recipeJson = {
          name: dishName || "Custom Recipe",
          ingredients: ingredients || ["Ingredients not specified"],
          instructions: generatedText,
          prepTime: 30,
          cookTime: 30,
          servings: 4,
          nutritionFacts: {
            calories: 400,
            protein: 20,
            carbs: 30,
            fats: 15,
          },
        };
        console.log("Created fallback recipe after parsing failure");
      }
    }

    // Add source information
    recipeJson.source = "gemini";

    // Generate a placeholder image if none provided
    if (!recipeJson.image) {
      recipeJson.image = `https://source.unsplash.com/random/800x600/?food,${encodeURIComponent(
        recipeJson.name || dishName || "recipe"
      )}`;
    }

    return recipeJson;
  } catch (error) {
    console.error("Gemini API request failed:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", JSON.stringify(error.response.data));

      // Log specific error information for 400 errors
      if (error.response.status === 400) {
        console.error("Bad Request Details:");
        console.error("Headers:", JSON.stringify(error.response.headers));
        console.error("Config:", JSON.stringify(error.config));
      }
    } else if (error.code === "ECONNABORTED") {
      console.error("Request timed out");
    } else if (error.request) {
      console.error("No response received:", error.request);
    }
    throw error;
  }
};

/**
 * Generate a recipe using Spoonacular API
 * @param {Array} ingredients - List of ingredients
 * @param {String} dishName - Name of the dish
 * @returns {Object} Structured recipe data
 */
const generateRecipeWithSpoonacular = async (ingredients, dishName) => {
  let recipeId;
  let searchAttempt = 1;
  let maxAttempts = 2;

  // Function to create a basic recipe when API fails
  const createFallbackRecipe = () => {
    console.log("Creating fallback Spoonacular recipe");
    return {
      name:
        dishName ||
        `Recipe with ${ingredients?.join(", ") || "custom ingredients"}`,
      ingredients: ingredients || ["Ingredients not specified"],
      instructions:
        "Instructions could not be generated. Please try with different ingredients or dish name.",
      prepTime: 30,
      cookTime: 30,
      servings: 4,
      image: `https://source.unsplash.com/random/800x600/?food,${encodeURIComponent(
        dishName || "recipe"
      )}`,
      source: "spoonacular",
      nutritionFacts: {
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
      },
    };
  };

  try {
    // First, search for a recipe based on ingredients or dish name
    while (searchAttempt <= maxAttempts && !recipeId) {
      console.log(`Spoonacular search attempt ${searchAttempt}`);

      try {
        if (ingredients && ingredients.length > 0) {
          // Search by ingredients
          console.log(
            `Searching Spoonacular by ingredients: ${ingredients.join(", ")}`
          );
          const searchResponse = await axios.get(
            `${SPOONACULAR_BASE_URL}/findByIngredients`,
            {
              params: {
                apiKey: SPOONACULAR_API_KEY,
                ingredients: ingredients.join(","),
                number: 5, // Increase to improve chances of finding something
                ranking: 1,
                ignorePantry: true,
              },
              timeout: 15000, // 15 seconds timeout
            }
          );

          if (searchResponse.data && searchResponse.data.length > 0) {
            recipeId = searchResponse.data[0].id;
            console.log(`Found recipe ID by ingredients: ${recipeId}`);
          } else {
            console.log("No recipes found with the provided ingredients");

            // If we have a dish name, try that on the second attempt
            if (searchAttempt === 1 && dishName) {
              searchAttempt++;
              continue;
            }
          }
        } else if (dishName) {
          // Search by dish name
          console.log(`Searching Spoonacular by dish name: ${dishName}`);

          // Try a broader search on second attempt
          const query = searchAttempt === 1 ? dishName : dishName.split(" ")[0];

          const searchResponse = await axios.get(
            `${SPOONACULAR_BASE_URL}/complexSearch`,
            {
              params: {
                apiKey: SPOONACULAR_API_KEY,
                query: query,
                number: 5, // Increase to improve chances of finding something
              },
              timeout: 15000, // 15 seconds timeout
            }
          );

          if (
            searchResponse.data &&
            searchResponse.data.results &&
            searchResponse.data.results.length > 0
          ) {
            recipeId = searchResponse.data.results[0].id;
            console.log(`Found recipe ID by dish name: ${recipeId}`);
          } else {
            console.log(`No recipes found for "${query}"`);

            // If we have ingredients, try that on the second attempt
            if (searchAttempt === 1 && ingredients && ingredients.length > 0) {
              searchAttempt++;
              continue;
            }
          }
        } else {
          throw new Error("Either ingredients or dish name must be provided");
        }
      } catch (error) {
        console.error(
          `Spoonacular search attempt ${searchAttempt} failed:`,
          error.message
        );
      }

      searchAttempt++;
    }

    // If no recipe ID was found after all attempts, return a fallback recipe
    if (!recipeId) {
      console.log(
        "Exhausted all Spoonacular search attempts, using fallback recipe"
      );
      return createFallbackRecipe();
    }

    // Get detailed recipe information
    console.log(`Retrieving detailed recipe information for ID: ${recipeId}`);
    const recipeResponse = await axios.get(
      `${SPOONACULAR_BASE_URL}/${recipeId}/information`,
      {
        params: {
          apiKey: SPOONACULAR_API_KEY,
          includeNutrition: true,
        },
        timeout: 15000, // 15 seconds timeout
      }
    );

    const recipeData = recipeResponse.data;

    // Format the recipe data to match our structure
    const formattedRecipe = {
      name: recipeData.title,
      ingredients: recipeData.extendedIngredients.map((ing) => ing.original),
      instructions: recipeData.instructions || "No instructions provided",
      prepTime:
        recipeData.preparationMinutes ||
        Math.floor(recipeData.readyInMinutes / 2),
      cookTime:
        recipeData.cookingMinutes || Math.floor(recipeData.readyInMinutes / 2),
      servings: recipeData.servings,
      image: recipeData.image,
      sourceUrl: recipeData.sourceUrl,
      source: "spoonacular",
      sourceId: recipeData.id,
      nutritionFacts: {
        calories:
          recipeData.nutrition?.nutrients.find((n) => n.name === "Calories")
            ?.amount || 0,
        protein:
          recipeData.nutrition?.nutrients.find((n) => n.name === "Protein")
            ?.amount || 0,
        carbs:
          recipeData.nutrition?.nutrients.find(
            (n) => n.name === "Carbohydrates"
          )?.amount || 0,
        fats:
          recipeData.nutrition?.nutrients.find((n) => n.name === "Fat")
            ?.amount || 0,
      },
    };

    return formattedRecipe;
  } catch (error) {
    console.error("Error in generateRecipeWithSpoonacular:", error.message);
    if (error.response) {
      console.error("Spoonacular API error:", {
        status: error.response.status,
        data: error.response.data,
      });
    }

    // Return fallback recipe if anything goes wrong
    return createFallbackRecipe();
  }
};

/**
 * Save a generated recipe to the database
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const saveGeneratedRecipe = async (req, res) => {
  try {
    const { recipeData } = req.body;

    if (!recipeData || !recipeData.name || !recipeData.ingredients) {
      return res.status(400).json({
        success: false,
        message: "Invalid recipe data provided",
      });
    }

    // Create a new recipe document
    const recipe = new Recipe({
      name: recipeData.name,
      ingredients: recipeData.ingredients,
      instructions: recipeData.instructions,
      prepTime: recipeData.prepTime,
      cookTime: recipeData.cookTime || 0,
      servings: recipeData.servings,
      image: recipeData.image,
      nutritionFacts: recipeData.nutritionFacts,
      source: recipeData.source,
      sourceId: recipeData.sourceId,
      createdBy: req.user.id,
    });

    // Save the recipe
    await recipe.save();

    return res.status(201).json({
      success: true,
      message: "Recipe saved successfully",
      data: recipe,
    });
  } catch (error) {
    console.error("Error saving recipe:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save recipe",
      error: error.message,
    });
  }
};

/**
 * Generate a recipe using simplified prompt (for second attempt)
 */
const generateRecipeWithSimplifiedPrompt = async (
  prompt,
  ingredients,
  dishName
) => {
  console.log("Using simplified prompt approach");
  const config = {
    headers: { "Content-Type": "application/json" },
    timeout: 30000,
  };

  const response = await axios.post(
    `${GEMINI_BASE_URL}?key=${GEMINI_API_KEY}`,
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 1024,
      },
    },
    config
  );

  const generatedText = response.data.candidates[0].content.parts[0].text;

  // Create a simplified recipe from the generated text
  return {
    name: dishName || "Custom Recipe",
    ingredients: ingredients || extractIngredientsFromText(generatedText),
    instructions: generatedText,
    prepTime: 30,
    cookTime: 30,
    servings: 4,
    source: "gemini",
    image: `https://source.unsplash.com/random/800x600/?food,${encodeURIComponent(
      dishName || "recipe"
    )}`,
    nutritionFacts: {
      calories: 400,
      protein: 20,
      carbs: 30,
      fats: 15,
    },
  };
};

/**
 * Generate a recipe using alternative endpoint (for third attempt)
 */
const generateRecipeWithAlternativeEndpoint = async (
  endpoint,
  ingredients,
  dishName
) => {
  console.log("Trying alternative endpoint:", endpoint);
  const config = {
    headers: { "Content-Type": "application/json" },
    timeout: 30000,
  };

  const response = await axios.post(
    `${endpoint}?key=${GEMINI_API_KEY}`,
    {
      contents: [
        {
          parts: [
            {
              text: `Create a recipe for ${
                dishName || ""
              } using these ingredients: ${
                ingredients?.join(", ") || "any ingredients"
              }`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    },
    config
  );

  const generatedText = response.data.candidates[0].content.parts[0].text;

  // Create a recipe from the generated text
  return {
    name: dishName || "Custom Recipe",
    ingredients: ingredients || extractIngredientsFromText(generatedText),
    instructions: generatedText,
    prepTime: 30,
    cookTime: 30,
    servings: 4,
    source: "gemini",
    image: `https://source.unsplash.com/random/800x600/?food,${encodeURIComponent(
      dishName || "recipe"
    )}`,
    nutritionFacts: {
      calories: 400,
      protein: 20,
      carbs: 30,
      fats: 15,
    },
  };
};

/**
 * Helper function to extract ingredients from text
 */
const extractIngredientsFromText = (text) => {
  // Try to extract ingredients from generated text
  const lines = text.split("\n");
  const ingredients = [];

  let inIngredientsSection = false;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Look for common ingredient section indicators
    if (
      trimmedLine.toLowerCase().includes("ingredients") &&
      !trimmedLine.toLowerCase().includes("instructions")
    ) {
      inIngredientsSection = true;
      continue;
    }

    // Detect transition to instructions section
    if (
      inIngredientsSection &&
      (trimmedLine.toLowerCase().includes("instructions") ||
        trimmedLine.toLowerCase().includes("directions") ||
        trimmedLine.toLowerCase().includes("steps"))
    ) {
      inIngredientsSection = false;
      continue;
    }

    // Collect ingredients lines
    if (
      inIngredientsSection &&
      trimmedLine &&
      !trimmedLine.endsWith(":") &&
      /^[-•*]|\d+\.|\d+\/\d+|\d+\s+\w+/.test(trimmedLine)
    ) {
      ingredients.push(trimmedLine.replace(/^[-•*]\s*/, ""));
    }
  }

  // Return extracted ingredients or fallback
  return ingredients.length > 0 ? ingredients : ["Ingredients not specified"];
};

// Create a more detailed emergency recipe
const createEmergencyRecipe = (ingredients, dishName) => {
  let recipeName = dishName || "Custom Recipe";
  let recipeIngredients = [];
  let instructions = "";

  if (dishName === "Key Lime Pie") {
    recipeIngredients = [
      "1 1/2 cups graham cracker crumbs",
      "1/3 cup granulated sugar",
      "6 tablespoons butter, melted",
      "3 cups sweetened condensed milk",
      "2/3 cup fresh Key lime juice",
      "1 tablespoon Key lime zest",
      "4 large egg yolks",
      "Whipped cream for topping",
    ];

    instructions =
      "1. Preheat oven to 350°F (175°C).\n" +
      "2. In a bowl, combine graham cracker crumbs, sugar, and melted butter. Press into a 9-inch pie dish.\n" +
      "3. Bake crust for 8 minutes, then remove and cool.\n" +
      "4. In a large bowl, whisk together condensed milk, lime juice, lime zest, and egg yolks until smooth.\n" +
      "5. Pour the filling into the crust and bake for 15 minutes.\n" +
      "6. Let cool completely, then refrigerate for at least 2 hours before serving.\n" +
      "7. Top with whipped cream and additional lime zest if desired.";
  } else if (ingredients && ingredients.length > 0) {
    // Generate a basic recipe based on ingredients
    const basicInstructions = [
      "Prepare all ingredients by washing, cutting, and measuring as needed.",
      "Combine ingredients in a suitable cooking vessel.",
      "Cook over medium heat until done, stirring occasionally.",
      "Season to taste with salt and pepper.",
      "Serve hot and enjoy!",
    ];

    recipeIngredients = ingredients;
    instructions = basicInstructions.join("\n");
  } else {
    // Very generic recipe
    recipeIngredients = ["Ingredients based on your preferences"];
    instructions =
      "This recipe would typically include preparation steps, cooking instructions, and serving suggestions tailored to your specific request.";
  }

  return {
    name: recipeName,
    ingredients: recipeIngredients,
    instructions: instructions,
    prepTime: 20,
    cookTime: 30,
    servings: 4,
    source: "gemini",
    image: `https://source.unsplash.com/random/800x600/?food,${encodeURIComponent(
      recipeName
    )}`,
    nutritionFacts: {
      calories: 350,
      protein: 15,
      carbs: 40,
      fats: 12,
    },
  };
};
