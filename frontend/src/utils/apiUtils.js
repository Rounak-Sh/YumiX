/**
 * Utility functions for API debugging and error handling
 */

import axiosInstance, { ConnectionError } from "../config/axios";

// Extract relevant error information for better debugging
export const formatApiError = (error) => {
  if (!error) return "Unknown error";

  const errorInfo = {
    message: error.message || "Unknown error",
    status: error.response?.status,
    data: error.response?.data,
    config: {
      url: error.config?.url,
      method: error.config?.method,
      baseURL: error.config?.baseURL,
      fullUrl: error.config?.baseURL + error.config?.url,
    },
  };

  return errorInfo;
};

/**
 * Function to check if the API is available
 * @returns {Promise<boolean>} - True if API is available, false otherwise
 */
export const checkApiHealth = async () => {
  try {
    // Remove redundant /api prefix since baseURL already includes it
    const response = await axiosInstance.get("/health");
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error("API Health Check Error:", error);
    return {
      success: false,
      error: error.message || "API is unavailable",
      isConnectionError: error instanceof ConnectionError,
    };
  }
};
