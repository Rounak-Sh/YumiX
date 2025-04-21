/**
 * Utility functions for API debugging and error handling
 */

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

// Check the health of backend API and return status
export const checkApiHealth = async (axiosInstance) => {
  try {
    // Make sure this matches your backend route
    const response = await axiosInstance.get("/api/health");
    return response.data.status === "running";
  } catch (error) {
    console.error("API Health Check Error:", error);
    return false;
  }
};
