import axiosInstance from "../config/axios";
import axios from "axios";

// Add these functions to your userService.js file

// Get user favorites
export const getUserFavorites = async () => {
  try {
    const response = await axiosInstance.get("/api/users/favorites");
    return response.data;
  } catch (error) {
    console.error("Error fetching favorites:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    return {
      success: false,
      message: error.response?.data?.message || "Failed to fetch favorites",
      data: [],
      limits: {
        current: 0,
        max: 5,
        remaining: 5,
        plan: "Free",
      },
    };
  }
};

// Remove a recipe from favorites
export const removeFavorite = async (recipeId) => {
  try {
    const response = await axiosInstance.delete(
      `/api/users/favorites/${recipeId}`
    );
    return response.data;
  } catch (error) {
    console.error("Error removing favorite:", error);
    return {
      success: false,
      message:
        error.response?.data?.message || "Failed to remove from favorites",
    };
  }
};

// Add a recipe to favorites
export const addFavorite = async (recipeId) => {
  try {
    const response = await axiosInstance.post(
      `/api/users/favorites/${recipeId}`
    );
    return response.data;
  } catch (error) {
    console.error("Error adding favorite:", error);
    if (
      error.response?.status === 400 &&
      error.response?.data?.message?.includes("limit")
    ) {
      // Handle limit reached error specifically
      return {
        success: false,
        message: error.response.data.message,
        limitReached: true,
        limit: error.response.data.limit,
        current: error.response.data.current,
        plan: error.response.data.plan,
      };
    }
    return {
      success: false,
      message: error.response?.data?.message || "Failed to add to favorites",
    };
  }
};

// Toggle favorite status (add or remove)
export const toggleFavorite = async (
  recipeId,
  isFavorite,
  recipeData = null
) => {
  try {
    if (!recipeId) {
      console.error("Toggle favorite failed: No recipe ID provided");
      return {
        success: false,
        message: "Recipe ID is required",
      };
    }

    // Convert recipeId to string to ensure consistent handling
    const recipeIdStr = recipeId.toString();

    // Log information about the request
    console.log("Toggle favorite API call:", {
      recipeId: recipeIdStr,
      isAdding: isFavorite,
      hasRecipeData: !!recipeData,
      recipeSource: recipeData?.source || recipeData?.sourceType,
    });

    // Check if this is an AI recipe
    const isAIRecipe =
      recipeData?.source === "ai" || recipeData?.sourceType === "ai";

    // If recipeData is provided, ensure it has all the required fields
    let processedRecipeData = null;
    if (recipeData) {
      processedRecipeData = {
        name: recipeData.name || "Unknown Recipe",
        image: recipeData.image || "",
        ingredients: Array.isArray(recipeData.ingredients)
          ? recipeData.ingredients
          : [],
        instructions: recipeData.instructions || "",
        prepTime: recipeData.prepTime || recipeData.readyInMinutes || 30,
        servings: recipeData.servings || 4,
        // For AI recipes, ensure these fields are included
        ...(isAIRecipe
          ? {
              source: "ai",
              sourceType: "ai",
              _id: recipeIdStr,
              id: recipeIdStr,
            }
          : {}),
      };
    }

    const payload = {
      recipeId: recipeIdStr,
      isFavorite,
    };

    // Only include recipeData if it's processed and valid
    if (processedRecipeData) {
      payload.recipeData = processedRecipeData;

      // For debugging
      if (isAIRecipe) {
        console.log("Sending AI recipe to favorites API:", processedRecipeData);
      }
    }

    // Make the API call
    const response = await axiosInstance.post(
      "/api/recipes/favorites",
      payload
    );

    console.log("Favorites API response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error in toggleFavorite:", error);

    // Check for specific error cases
    if (error.response?.status === 401) {
      return {
        success: false,
        message: "Please log in to manage favorites",
      };
    }

    return {
      success: false,
      message: error.response?.data?.message || "Failed to update favorites",
    };
  }
};

// Update user preferences
export const updatePreferences = async (preferences) => {
  try {
    const response = await axiosInstance.put("/api/users/profile", {
      preferences,
    });
    return response.data;
  } catch (error) {
    console.error("Error updating preferences:", error);
    return {
      success: false,
      message: error.response?.data?.message || "Failed to update preferences",
    };
  }
};

// Update profile information
export const updateProfile = async (profileData) => {
  try {
    const response = await axiosInstance.put("/api/users/profile", profileData);
    return response.data;
  } catch (error) {
    console.error("Error updating profile:", error);
    return {
      success: false,
      message: error.response?.data?.message || "Failed to update profile",
    };
  }
};

// Upload profile image
export const uploadProfileImage = async (imageFile) => {
  try {
    const formData = new FormData();
    formData.append("profileImage", imageFile);

    const response = await axiosInstance.post(
      "/api/users/profile/image",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    // Handle the backend response which uses profilePicture but frontend expects profileImage
    if (response.data.success && response.data.data) {
      // If the backend returns profilePicture, adapt it to the frontend's expected profileImage field
      const data = { ...response.data };
      if (data.data.profilePicture && !data.data.profileImage) {
        data.data.profileImage = data.data.profilePicture;
      }
      return data;
    }

    return response.data;
  } catch (error) {
    console.error("Error uploading profile image:", error);
    return {
      success: false,
      message:
        error.response?.data?.message || "Failed to upload profile image",
    };
  }
};

// Update password
export const updatePassword = async (passwordData) => {
  try {
    const response = await axiosInstance.put(
      "/api/users/profile/password",
      passwordData
    );
    return response.data;
  } catch (error) {
    console.error("Error updating password:", error);
    return {
      success: false,
      message: error.response?.data?.message || "Failed to update password",
    };
  }
};

// Get user activity statistics
export const getActivityStats = async () => {
  try {
    const response = await axiosInstance.get("/api/users/activity-stats");
    return response.data;
  } catch (error) {
    console.error("Error fetching activity stats:", error);
    return {
      success: false,
      message:
        error.response?.data?.message || "Failed to fetch activity statistics",
      data: {
        savedRecipes: 0,
        viewedRecipes: 0,
        searches: 0,
      },
    };
  }
};

// Deactivate user account (renamed from deleteAccount)
export const deactivateAccount = async () => {
  try {
    const response = await axiosInstance.delete("/api/users/profile");
    return response.data;
  } catch (error) {
    console.error("Error deactivating account:", error);
    return {
      success: false,
      message: error.response?.data?.message || "Failed to deactivate account",
    };
  }
};

// Refresh current user data
export const refreshUser = async () => {
  try {
    const response = await axiosInstance.get("/api/users/profile");

    // If successful, update localStorage
    if (response.data.success) {
      const userData = response.data.data;

      // Handle profilePicture/profileImage field consistency
      if (userData.profilePicture && !userData.profileImage) {
        userData.profileImage = userData.profilePicture;
      }

      // Merge with existing user data to avoid losing fields
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      const mergedUser = { ...currentUser, ...userData };

      localStorage.setItem("user", JSON.stringify(mergedUser));

      return {
        success: true,
        data: mergedUser,
        message: "User data refreshed successfully",
      };
    }

    return response.data;
  } catch (error) {
    console.error("Error refreshing user data:", error);
    return {
      success: false,
      message: error.response?.data?.message || "Failed to refresh user data",
    };
  }
};

// Request OTP for email/phone update
export const requestUpdateOTP = async (
  type = "email",
  newValue = null,
  sendToNew = true
) => {
  try {
    console.log(
      `Requesting ${type} update OTP for ${newValue} with sendToNew=${sendToNew}`
    );

    const requestPayload = {
      type,
      newValue, // Send the new email or phone number to receive OTP
      sendToNew, // Control whether to send OTP to the new contact info or current one
    };

    console.log("OTP request payload:", JSON.stringify(requestPayload));

    const response = await axiosInstance.post(
      "/api/users/profile/update-otp",
      requestPayload
    );

    console.log(`OTP request response:`, response.data);

    return response.data;
  } catch (error) {
    console.error(`Error requesting ${type} update OTP:`, error);
    console.error("Error response:", error.response?.data);
    return {
      success: false,
      message:
        error.response?.data?.message ||
        `Failed to send verification code to your ${type}`,
    };
  }
};

// Update sensitive info with OTP verification
export const updateProfileWithOTP = async (data) => {
  try {
    const response = await axiosInstance.put(
      "/api/users/profile/update-with-otp",
      data
    );
    return response.data;
  } catch (error) {
    console.error("Error updating sensitive information:", error);
    return {
      success: false,
      message:
        error.response?.data?.message ||
        "Failed to update information. Please try again.",
    };
  }
};
