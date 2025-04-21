import axiosInstance, { ConnectionError } from "../config/axios";

// Cache for subscription data
const cache = {
  plans: {
    data: null,
    timestamp: 0,
  },
  status: {
    data: null,
    timestamp: 0,
  },
};

// Cache durations
const PLANS_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const STATUS_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

// Request tracking to prevent duplicate in-flight requests
let plansRequestInProgress = false;
let statusRequestInProgress = false;

// Debouncing system to prevent multiple rapid API calls
let refreshDebounceTimer = null;
let refreshInProgress = false;
let lastRefreshTime = 0;
const REFRESH_COOLDOWN = 500; // Minimum time between refreshes

// Track whether payment verification is already in progress
let verifyPaymentInProgress = false;
let verifyPaymentRetryCount = 0;
const MAX_VERIFY_RETRIES = 3;

// Helper function to normalize plan data
export function normalizePlanData(planData) {
  if (!planData) return null;

  // Deep copy to avoid mutation issues
  const normalizedPlan = JSON.parse(JSON.stringify(planData));

  // Ensure critical fields exist
  if (!normalizedPlan.name && normalizedPlan.planType) {
    normalizedPlan.name = normalizedPlan.planType;
  } else if (!normalizedPlan.name) {
    normalizedPlan.name = "Premium Plan";
  }

  if (!normalizedPlan.planType && normalizedPlan.name) {
    normalizedPlan.planType = normalizedPlan.name;
  }

  if (!normalizedPlan._id && normalizedPlan.id) {
    normalizedPlan._id = normalizedPlan.id;
  }

  return normalizedPlan;
}

// Get all subscription plans
export const getSubscriptionPlans = async (forceRefresh = false) => {
  // Check cache first if not forcing refresh
  const now = Date.now();
  if (
    !forceRefresh &&
    cache.plans.data &&
    now - cache.plans.timestamp < PLANS_CACHE_DURATION
  ) {
    return {
      success: true,
      data: cache.plans.data,
    };
  }

  // Prevent duplicate requests
  if (plansRequestInProgress) {
    // Return cached data if available while request is in progress
    if (cache.plans.data) {
      return {
        success: true,
        data: cache.plans.data,
      };
    }
    // Wait a bit and try again
    await new Promise((resolve) => setTimeout(resolve, 500));
    return getSubscriptionPlans(forceRefresh);
  }

  try {
    plansRequestInProgress = true;
    const response = await axiosInstance.get("/api/subscriptions/plans");

    // Update cache on success
    if (response.data.success && response.data.data) {
      cache.plans.data = response.data.data;
      cache.plans.timestamp = now;
    }

    return response.data;
  } catch (error) {
    // If we have cached data, return that on error
    if (cache.plans.data) {
      return {
        success: true,
        data: cache.plans.data,
        fromCache: true,
      };
    }
    throw error;
  } finally {
    plansRequestInProgress = false;
  }
};

// Check subscription status
export const checkSubscriptionStatus = async (forceRefresh = false) => {
  // Check if user is authenticated by looking for token
  const token = localStorage.getItem("token");
  if (!token) {
    return {
      success: true,
      data: {
        isSubscribed: false,
        plan: null,
        expiryDate: null,
        remainingSearches: 3,
        maxSearches: 3,
      },
    };
  }

  // Check cache first if not forcing refresh
  const now = Date.now();
  if (
    !forceRefresh &&
    cache.status.data &&
    now - cache.status.timestamp < STATUS_CACHE_DURATION
  ) {
    return {
      success: true,
      data: cache.status.data,
    };
  }

  // Prevent duplicate requests
  if (statusRequestInProgress) {
    // Return cached data if available while request is in progress
    if (cache.status.data) {
      return {
        success: true,
        data: cache.status.data,
      };
    }
    // Wait a bit and try again
    await new Promise((resolve) => setTimeout(resolve, 500));
    return checkSubscriptionStatus(forceRefresh);
  }

  try {
    statusRequestInProgress = true;

    // Add a timestamp to prevent browser caching
    const timestamp = Date.now();
    const response = await axiosInstance.get(
      `/api/subscriptions/subscription-status?t=${timestamp}`
    );

    // Update cache on success
    if (response.data.success && response.data.data) {
      // Check for inconsistency: isSubscribed=true but no plan data
      if (
        response.data.data.isSubscribed === true &&
        !response.data.data.plan
      ) {
        // We'll still accept the response but set a warning
        response.data.data.warning =
          "Subscription active but missing plan data";

        // Try to fetch plans and see if we can fill in the gap
        try {
          const plansResponse = await getSubscriptionPlans(true);
          if (
            plansResponse.success &&
            plansResponse.data &&
            plansResponse.data.length > 0
          ) {
            // Look for an active plan
            const activePlan = plansResponse.data.find((p) => p.isActive);
            if (activePlan) {
              response.data.data.plan = activePlan;
            }
          }
        } catch (err) {
          console.error("Error attempting to fix plan inconsistency:", err);
        }
      }

      // Ensure plan data is normalized if present
      if (response.data.data.plan) {
        // Normalize plan data before caching
        response.data.data.plan = normalizePlanData(response.data.data.plan);
      }

      cache.status.data = response.data.data;
      cache.status.timestamp = now;

      // Also store in localStorage as additional backup
      localStorage.setItem(
        "subscriptionStatus",
        JSON.stringify({
          data: response.data.data,
          timestamp: now,
        })
      );
    }

    return response.data;
  } catch (error) {
    console.error("Error checking subscription status:", error);

    // If we have cached data, return that on error
    if (cache.status.data) {
      return {
        success: true,
        data: cache.status.data,
        fromCache: true,
      };
    }

    // Try to get data from localStorage if memory cache failed
    try {
      const localData = localStorage.getItem("subscriptionStatus");
      if (localData) {
        const parsed = JSON.parse(localData);
        return {
          success: true,
          data: parsed.data,
          fromLocalStorage: true,
        };
      }
    } catch (e) {
      console.error("Error parsing localStorage subscription data:", e);
    }

    return {
      success: false,
      message:
        error.response?.data?.message || "Failed to check subscription status",
      data: {
        isSubscribed: false,
        plan: null,
        expiryDate: null,
        remainingSearches: 3,
        maxSearches: 3,
      },
    };
  } finally {
    statusRequestInProgress = false;
  }
};

// Create order for subscription
export const createOrder = async (planId) => {
  try {
    const response = await axiosInstance.post(
      "/api/subscriptions/create-order",
      {
        planId,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error creating order:", error);

    // Extract the most meaningful error message
    let errorMessage = "Failed to create order";

    if (error.response) {
      // The request was made and the server responded with an error status
      if (error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
      }
      // If there's more detailed error information
      else if (error.response.data && error.response.data.error) {
        errorMessage = error.response.data.error;
      }
    } else if (error.request) {
      // The request was made but no response was received
      errorMessage =
        "No response from server. Please check your connection and try again.";
    } else {
      // Something else happened in setting up the request
      errorMessage = error.message || "An unknown error occurred";
    }

    return {
      success: false,
      message: errorMessage,
    };
  }
};

/**
 * Alias for createOrder - used for backward compatibility
 */
export const initiatePayment = createOrder;

/**
 * Get details for a specific plan
 */
export const getPlanDetails = async (planId) => {
  try {
    // First try to get from cached plans
    const plansResponse = await getSubscriptionPlans();

    if (
      plansResponse.success &&
      plansResponse.data &&
      plansResponse.data.length > 0
    ) {
      // Find the requested plan in the cached data
      const plan = plansResponse.data.find(
        (p) => p._id === planId || p.id === planId
      );

      if (plan) {
        return {
          success: true,
          data: normalizePlanData(plan),
        };
      }
    }

    // If not found in cache, request directly
    const response = await axiosInstance.get(
      `/api/subscriptions/plans/${planId}`
    );

    if (response.data && response.data.data) {
      return {
        success: true,
        data: normalizePlanData(response.data.data),
      };
    }

    return response.data;
  } catch (error) {
    console.error("Error fetching plan details:", error);
    return {
      success: false,
      message: error.response?.data?.message || "Failed to fetch plan details",
    };
  }
};

/**
 * Verify a payment with the backend
 */
export const verifyPayment = async (params) => {
  // Don't allow multiple verification attempts to run simultaneously
  if (verifyPaymentInProgress) {
    // Try to return the last verification result if available
    const lastResult = localStorage.getItem("lastVerificationResult");
    if (lastResult) {
      try {
        return JSON.parse(lastResult);
      } catch (e) {
        console.error("Error parsing cached verification result:", e);
      }
    }

    return {
      success: false,
      message:
        "Another payment verification is already in progress. Please wait.",
      errorCode: "VERIFICATION_IN_PROGRESS",
    };
  }

  try {
    verifyPaymentInProgress = true;

    // Clear any previous verification results
    localStorage.removeItem("lastVerificationResult");

    // Extract parameters
    const { subscriptionId, orderId, linkId, paymentId } = params;

    // Validate required parameters
    const errors = [];

    // Only validate subscriptionId if we're not handling a Cashfree payment link
    if (!linkId && !subscriptionId) errors.push("Missing subscriptionId");

    // Either orderId or linkId must be present
    if (!orderId && !linkId) errors.push("Missing both orderId and linkId");

    if (errors.length > 0) {
      const errorMessage = errors.join(", ");
      console.error(`Payment verification failed: ${errorMessage}`);
      const result = {
        success: false,
        message: errorMessage,
        errorCode: "MISSING_PARAMETERS",
      };
      localStorage.setItem("lastVerificationResult", JSON.stringify(result));
      return result;
    }

    // Clear all subscription caches before verification
    clearSubscriptionCache();

    // Create payload object for POST request
    const payload = {};
    if (subscriptionId) {
      payload.subscriptionId = subscriptionId;
    }

    if (orderId) payload.orderId = orderId;
    if (linkId) payload.linkId = linkId;
    if (paymentId) payload.paymentId = paymentId;

    // Try to verify payment with retries
    let retryCount = 0;
    let lastError = null;

    while (retryCount <= MAX_VERIFY_RETRIES) {
      try {
        // Use axiosInstance which has the correct base URL and auth token handling
        const response = await axiosInstance.post(
          "/api/subscriptions/verify-payment",
          payload
        );

        // Store the successful result
        localStorage.setItem(
          "lastVerificationResult",
          JSON.stringify(response.data)
        );

        // Reset retry counter on success
        verifyPaymentRetryCount = 0;

        // Trigger a subscription refresh
        setTimeout(() => {
          refreshSubscriptionStatus(true).catch((err) =>
            console.error("Error refreshing after verification:", err)
          );
        }, 1000);

        return response.data;
      } catch (error) {
        lastError = error;

        // If this is a connection error, retry
        if (
          error instanceof ConnectionError ||
          (!error.response &&
            error.message &&
            error.message.includes("Network Error"))
        ) {
          if (retryCount < MAX_VERIFY_RETRIES) {
            // Exponential backoff: 1s, 2s, 4s, etc.
            const delay = Math.pow(2, retryCount) * 1000;
            await new Promise((resolve) => setTimeout(resolve, delay));
            retryCount++;
            continue;
          }
        }

        // For other errors or if we've exhausted retries, break the loop
        break;
      }
    }

    // Handle specific error cases
    if (lastError?.response?.status === 404) {
      console.error("Payment verification endpoint not found");
      const result = {
        success: false,
        message:
          "Payment verification endpoint not found. Please try again later.",
        errorCode: "ENDPOINT_NOT_FOUND",
      };
      localStorage.setItem("lastVerificationResult", JSON.stringify(result));
      return result;
    }

    if (lastError?.response?.status === 401) {
      console.error("Unauthorized payment verification attempt");
      const result = {
        success: false,
        message: "Unauthorized. Please log in again.",
        errorCode: "UNAUTHORIZED",
      };
      localStorage.setItem("lastVerificationResult", JSON.stringify(result));
      return result;
    }

    // Connection/network error
    if (
      lastError instanceof ConnectionError ||
      (!lastError.response &&
        lastError.message &&
        lastError.message.includes("Network Error"))
    ) {
      // Increment global retry counter to track overall connection issues
      verifyPaymentRetryCount++;

      // If we've had too many failed attempts, suggest reload
      const errorMessage =
        verifyPaymentRetryCount > 3
          ? "Connection error. Please check your internet and reload the page."
          : "Connection to server failed. Please try again.";

      const result = {
        success: false,
        message: errorMessage,
        errorCode: "CONNECTION_ERROR",
        retry: verifyPaymentRetryCount <= 3,
      };
      localStorage.setItem("lastVerificationResult", JSON.stringify(result));
      return result;
    }

    // Generic error case
    console.error("Error during payment verification:", lastError);
    const result = {
      success: false,
      message:
        lastError?.response?.data?.message ||
        "An unexpected error occurred during payment verification",
      errorCode: "UNEXPECTED_ERROR",
      error: lastError?.message,
    };
    localStorage.setItem("lastVerificationResult", JSON.stringify(result));
    return result;
  } finally {
    verifyPaymentInProgress = false;
  }
};

// Clear subscription cache
export const clearSubscriptionCache = () => {
  cache.status.data = null;
  cache.status.timestamp = 0;

  // Also clear any localStorage cache
  localStorage.removeItem("subscriptionStatus");

  return true;
};

// Clear plans cache
export const clearPlansCache = () => {
  cache.plans.data = null;
  cache.plans.timestamp = 0;
  return true;
};

/**
 * Cancel current subscription
 */
export const cancelSubscription = async () => {
  try {
    const response = await axiosInstance.post("/api/subscriptions/cancel");

    if (response.data.success) {
      // Clear caches to update subscription state
      clearSubscriptionCache();
    }

    return response.data;
  } catch (error) {
    console.error("Error cancelling subscription:", error);

    let errorMessage = "Failed to cancel subscription";

    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    }

    return {
      success: false,
      message: errorMessage,
    };
  }
};

// Refresh subscription status - force new fetch
export const refreshSubscriptionStatus = async (forceRefresh = true) => {
  // Return a promise that can be awaited by callers
  return new Promise(async (resolve, reject) => {
    try {
      // If a refresh is already in progress, don't start another one
      if (refreshInProgress) {
        return resolve({
          message: "Refresh already in progress",
          success: true,
          isDebounced: true,
        });
      }

      // Check if we're trying to refresh too soon after a previous refresh
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshTime;

      if (!forceRefresh && timeSinceLastRefresh < 2000) {
        // Check if we have cache data we can return
        const cached = localStorage.getItem("subscriptionStatus");
        if (cached) {
          try {
            const cachedData = JSON.parse(cached);
            return resolve({
              ...cachedData.data,
              success: true,
              message: "Using cached data",
              isCache: true,
            });
          } catch (e) {
            console.error("Error parsing cache:", e);
          }
        }
      }

      // Clear any existing debounce timer
      if (refreshDebounceTimer) {
        clearTimeout(refreshDebounceTimer);
      }

      // Set a new debounce timer
      refreshDebounceTimer = setTimeout(
        async () => {
          // Set the in-progress flag to prevent duplicate calls
          refreshInProgress = true;

          // Always clear cache when force refreshing
          if (forceRefresh) {
            clearSubscriptionCache();
          }

          try {
            // Add unique timestamp to request to prevent caching
            const timestamp = Date.now();

            // Make direct API call to get fresh data
            const response = await axiosInstance.get(
              `/api/subscriptions/subscription-status?t=${timestamp}`
            );

            // Validate the response
            if (response.data && response.data.success) {
              const freshData = response.data.data;

              // Check for data consistency - a user cannot be subscribed without a plan
              if (freshData.isSubscribed && !freshData.plan) {
                // Only try to fetch plans if forced
                if (forceRefresh) {
                  try {
                    const plansResponse = await getSubscriptionPlans(true);
                    if (
                      plansResponse.success &&
                      plansResponse.data?.length > 0
                    ) {
                      // Use the first active plan as a fallback
                      const activePlan = plansResponse.data.find(
                        (p) => p.isActive
                      );
                      if (activePlan) {
                        freshData.plan = normalizePlanData(activePlan);
                      }
                    }
                  } catch (err) {
                    console.error("Error fetching plans for fallback:", err);
                  }
                }
              }

              // Update the cache with fresh data
              cache.status.data = freshData;
              cache.status.timestamp = Date.now();
              lastRefreshTime = Date.now();

              // Also update localStorage cache
              localStorage.setItem(
                "subscriptionStatus",
                JSON.stringify({
                  data: freshData,
                  timestamp: Date.now(),
                })
              );

              refreshInProgress = false;
              resolve(freshData);
            } else {
              throw new Error(
                "Failed to refresh subscription status: " +
                  (response.data?.message || "Unknown error")
              );
            }
          } catch (error) {
            console.error(`Error refreshing subscription status:`, error);

            // Try to return cached data as fallback
            const cached = localStorage.getItem("subscriptionStatus");
            if (cached) {
              try {
                const parsedCache = JSON.parse(cached);
                refreshInProgress = false;
                resolve(parsedCache.data);
                return;
              } catch (cacheError) {
                console.error(
                  "Error parsing cached subscription data:",
                  cacheError
                );
              }
            }

            refreshInProgress = false;

            // If all else fails, return a default object to prevent UI errors
            resolve({
              isSubscribed: false,
              plan: null,
              expiryDate: null,
              remainingSearches: 3, // Default free tier
              maxSearches: 3, // Default free tier
            });
          }
        },
        forceRefresh ? 0 : REFRESH_COOLDOWN
      ); // Apply throttling unless it's a forced refresh
    } catch (error) {
      refreshInProgress = false;
      reject(error);
    }
  });
};
