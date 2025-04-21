import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useRef,
  useCallback,
} from "react";
import {
  getSubscriptionPlans,
  checkSubscriptionStatus,
  normalizePlanData,
  clearSubscriptionCache,
} from "../services/subscriptionService";
import { showToast } from "../utils/toast";
import axiosInstance from "../config/axios";
import { verifyStoredToken, isTokenExpired } from "../utils/authUtils";
import { useAuth } from "./AuthContext";

const SubscriptionContext = createContext();

// Request tracking to prevent duplicate in-flight requests
let plansRequestInProgress = false;
let statusRequestInProgress = false;

// Cache durations
const PLANS_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const STATUS_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

// Global refresh state to prevent infinite loops
let globalRefreshInProgress = false;
let lastRefreshTimestamp = 0;
const MIN_REFRESH_INTERVAL = 5000; // 5 seconds minimum between refreshes

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error(
      "useSubscription must be used within a SubscriptionProvider"
    );
  }
  return context;
};

export const SubscriptionProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [plans, setPlans] = useState([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [expiryDate, setExpiryDate] = useState(null);
  const [remainingSearches, setRemainingSearches] = useState(3); // Default for non-subscribers
  const [maxSearches, setMaxSearches] = useState(3); // Default for non-subscribers
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [error, setError] = useState(null);

  // Track last refresh time to prevent excessive API calls
  const lastPlansRefreshTime = useRef(0);
  const lastStatusRefreshTime = useRef(0);

  // Fetch subscription plans - optimized to work for both guest and authenticated users
  const fetchSubscriptionPlans = useCallback(
    async (forceRefresh = false) => {
      // Check if we're already fetching plans
      if (plansRequestInProgress) {
        return;
      }

      // Check if we've fetched plans recently
      const now = Date.now();
      if (
        !forceRefresh &&
        now - lastPlansRefreshTime.current < PLANS_CACHE_DURATION &&
        plans.length > 0
      ) {
        return;
      }

      try {
        plansRequestInProgress = true;
        setIsLoadingPlans(true);

        const response = await getSubscriptionPlans(forceRefresh);

        if (response.success && Array.isArray(response.data)) {
          setPlans(response.data);
          lastPlansRefreshTime.current = now;
        } else {
          setError("Failed to fetch subscription plans");
        }
      } catch (error) {
        setError("Error fetching subscription plans");
      } finally {
        setIsLoadingPlans(false);
        plansRequestInProgress = false;
      }
    },
    [plans.length]
  );

  // Fetch subscription status - only for authenticated users
  const fetchSubscriptionStatus = useCallback(
    async (forceRefresh = false) => {
      // Skip if not authenticated
      if (!isAuthenticated) {
        return;
      }

      // Check if we're already fetching status
      if (statusRequestInProgress) {
        return;
      }

      // Check if we've fetched status recently
      const now = Date.now();

      // Check if it's a new day since last refresh - if so, force refresh
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const lastRefreshDay = lastStatusRefreshTime.current
        ? new Date(lastStatusRefreshTime.current).toISOString().split("T")[0]
        : null;

      // If it's a new day, we want to force a refresh to get updated search counts
      const isNewDay = lastRefreshDay && lastRefreshDay !== today;

      if (isNewDay) {
        forceRefresh = true;
      }

      if (
        !forceRefresh &&
        now - lastStatusRefreshTime.current < STATUS_CACHE_DURATION
      ) {
        return;
      }

      try {
        statusRequestInProgress = true;
        setIsLoadingStatus(true);

        const response = await checkSubscriptionStatus(forceRefresh);

        if (response.success) {
          setIsSubscribed(response.data.isSubscribed);
          setCurrentPlan(response.data.plan);
          setExpiryDate(response.data.expiryDate);

          // Handle remaining searches based on subscription status
          if (response.data.isSubscribed) {
            // Check if plan has unlimited searches (Pro plan)
            const hasUnlimitedSearches =
              response.data.plan &&
              (response.data.plan.maxSearchesPerDay === 999999 ||
                response.data.plan.maxSearchesPerDay === -1);

            if (hasUnlimitedSearches) {
              // For unlimited plans, set to a high number
              setRemainingSearches(999999);
              setMaxSearches(999999);
            } else {
              // For plans with limits (like Basic/Premium), use exact remaining count
              const remaining =
                response.data.remainingSearches === "unlimited"
                  ? response.data.maxSearches
                  : response.data.remainingSearches;

              setRemainingSearches(remaining || 0);
              setMaxSearches(response.data.maxSearches || 10);
            }
          } else {
            // For free users, use the exact remaining searches count
            setRemainingSearches(response.data.remainingSearches || 0);
            setMaxSearches(response.data.maxSearches || 3);
          }

          lastStatusRefreshTime.current = now;
        } else {
          setError("Failed to fetch subscription status");
        }
      } catch (error) {
        setError("Error fetching subscription status");
      } finally {
        setIsLoadingStatus(false);
        statusRequestInProgress = false;
      }
    },
    [isAuthenticated]
  );

  // Combined function to refresh all subscription data
  const refreshSubscriptionData = useCallback(
    async (forceRefresh = false) => {
      // Prevent multiple refreshes within short period
      const now = Date.now();
      if (!forceRefresh && globalRefreshInProgress) {
        return { success: false, message: "Refresh already in progress" };
      }

      if (!forceRefresh && now - lastRefreshTimestamp < MIN_REFRESH_INTERVAL) {
        return { success: false, message: "Refresh too frequent" };
      }

      try {
        globalRefreshInProgress = true;
        lastRefreshTimestamp = now;

        // Always fetch plans for all users
        await fetchSubscriptionPlans(forceRefresh);

        // Only fetch subscription status for authenticated users
        if (isAuthenticated) {
          await fetchSubscriptionStatus(forceRefresh);
        }

        return { success: true };
      } catch (error) {
        setError("Error refreshing subscription data");
        return { success: false, error };
      } finally {
        globalRefreshInProgress = false;
      }
    },
    [isAuthenticated, fetchSubscriptionPlans, fetchSubscriptionStatus]
  );

  // Function to update search count after a search operation
  const updateSearchCount = useCallback(
    async (searchResponse) => {
      if (!isAuthenticated) return;

      try {
        // If the response contains search count information, update our state
        if (searchResponse?.remainingSearches !== undefined) {
          // Check if the response indicates unlimited searches (value of 999999)
          const responseIndicatesUnlimited =
            searchResponse.remainingSearches === 999999 ||
            searchResponse.remainingSearches === "unlimited";

          // Check if the current plan has unlimited searches based on the plan definition
          const planHasUnlimited =
            isSubscribed &&
            currentPlan &&
            (currentPlan.maxSearchesPerDay === 999999 ||
              currentPlan.maxSearchesPerDay === -1);

          const hasUnlimitedSearches =
            responseIndicatesUnlimited || planHasUnlimited;

          // For users with unlimited searches, always set to 999999
          if (hasUnlimitedSearches) {
            setRemainingSearches(999999);
          } else {
            // For users with limited searches (free or basic/premium), use the exact count
            const remaining =
              typeof searchResponse.remainingSearches === "string"
                ? parseInt(searchResponse.remainingSearches, 10)
                : searchResponse.remainingSearches;

            // Only update if it's a valid number
            if (typeof remaining === "number" && !isNaN(remaining)) {
              setRemainingSearches(remaining);
            }
          }

          // If a user is close to their limit (less than 20% remaining), refresh data
          if (!hasUnlimitedSearches) {
            const searchesLeft =
              typeof searchResponse.remainingSearches === "string"
                ? parseInt(searchResponse.remainingSearches, 10)
                : searchResponse.remainingSearches;

            const limitIsLow =
              searchesLeft < 2 ||
              (maxSearches > 0 && searchesLeft / maxSearches <= 0.2);

            if (limitIsLow) {
              await refreshSubscriptionData(true);
            }
          }
        }
      } catch (error) {
        setError("Error updating search count");
      }
    },
    [
      isAuthenticated,
      isSubscribed,
      maxSearches,
      refreshSubscriptionData,
      currentPlan,
    ]
  );

  // Initial data fetch
  useEffect(() => {
    // Always fetch plans on mount
    fetchSubscriptionPlans();

    // Only fetch subscription status if authenticated
    if (isAuthenticated) {
      fetchSubscriptionStatus();
    }
  }, [isAuthenticated, fetchSubscriptionPlans, fetchSubscriptionStatus]);

  // Reset subscription state when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      setIsSubscribed(false);
      setCurrentPlan(null);
      setExpiryDate(null);
      setRemainingSearches(3);
      setMaxSearches(3);
    }
  }, [isAuthenticated]);

  // The value to be provided by the context
  const contextValue = {
    plans,
    isSubscribed,
    currentPlan,
    expiryDate,
    remainingSearches,
    maxSearches,
    isLoadingPlans,
    isLoadingStatus,
    error,
    refreshSubscriptionData,
    updateSearchCount,
  };

  return (
    <SubscriptionContext.Provider value={contextValue}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export default SubscriptionContext;
