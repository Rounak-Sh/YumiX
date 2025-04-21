import React, { useEffect, useRef } from "react";
import { useSubscription } from "../context/SubscriptionContext";
import { useAuth } from "../context/AuthContext";
import { useLocation } from "react-router-dom";

/**
 * Optimized component that synchronizes subscription data
 * with proper throttling and debouncing to prevent excessive API calls
 */
const SubscriptionSynchronizer = ({ refreshInterval = 5 * 60 * 1000 }) => {
  const { refreshSubscriptionData } = useSubscription();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const location = useLocation();

  // Use refs to track state and prevent excessive refreshes
  const lastRefreshTime = useRef(null);
  const refreshTimeoutRef = useRef(null);
  const refreshInProgress = useRef(false);
  const refreshCount = useRef(0);
  const isSubscriptionPage = useRef(false);

  // Check if current page is subscription page - store in ref to avoid dependency changes
  useEffect(() => {
    isSubscriptionPage.current = location.pathname.startsWith("/subscription");
    console.log(
      `SubscriptionSynchronizer: On subscription page: ${isSubscriptionPage.current}`
    );
  }, [location.pathname]);

  // Constants for rate limiting
  const MAX_REFRESHES_PER_MINUTE = 1; // Reduce to 1 per minute
  const REFRESH_COUNT_RESET_INTERVAL = 60000; // 1 minute
  const MIN_REFRESH_INTERVAL = 60000; // 1 minute minimum between refreshes

  // Clean up timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  // Reset refresh count periodically
  useEffect(() => {
    const resetInterval = setInterval(() => {
      refreshCount.current = 0;
    }, REFRESH_COUNT_RESET_INTERVAL);

    return () => clearInterval(resetInterval);
  }, []);

  // Check if we should allow a refresh based on rate limits and current page
  const canRefresh = () => {
    // NEVER refresh on subscription page to prevent loops
    if (isSubscriptionPage.current) {
      console.log(
        "SubscriptionSynchronizer: On subscription page, skipping refresh"
      );
      return false;
    }

    if (refreshCount.current >= MAX_REFRESHES_PER_MINUTE) {
      console.log(
        "SubscriptionSynchronizer: Rate limit exceeded, skipping refresh"
      );
      return false;
    }

    const now = Date.now();
    const timeSinceLastRefresh = lastRefreshTime.current
      ? now - lastRefreshTime.current
      : Infinity;

    if (timeSinceLastRefresh < MIN_REFRESH_INTERVAL) {
      console.log(
        `SubscriptionSynchronizer: Too soon to refresh (${timeSinceLastRefresh}ms), skipping`
      );
      return false;
    }

    return true;
  };

  // Debounced refresh function with rate limiting
  const debouncedRefresh = async (force = false) => {
    // Skip if refresh already in progress
    if (refreshInProgress.current) {
      console.log(
        "SubscriptionSynchronizer: Refresh already in progress, skipping"
      );
      return;
    }

    // Skip if rate limited and not forced
    if (!canRefresh() && !force) {
      console.log(
        "SubscriptionSynchronizer: Rate limited, skipping non-forced refresh"
      );
      return;
    }

    try {
      refreshInProgress.current = true;
      refreshCount.current += 1;
      console.log("SubscriptionSynchronizer: Starting refresh");
      await refreshSubscriptionData(force);
      lastRefreshTime.current = Date.now();
      console.log("SubscriptionSynchronizer: Refresh completed");
    } catch (error) {
      console.error("SubscriptionSynchronizer: Error refreshing data:", error);
    } finally {
      refreshInProgress.current = false;
    }
  };

  // Main subscription synchronization effect - ONLY run on mount/unmount and auth state changes
  useEffect(() => {
    // Skip if auth is still loading or user is not authenticated
    if (authLoading || !isAuthenticated) {
      console.log(
        "SubscriptionSynchronizer: Not authenticated or still loading, skipping sync"
      );
      return;
    }

    // Check if coming from payment page (special case)
    const comingFromPayment =
      localStorage.getItem("comingFromPaymentRedirect") === "true" ||
      localStorage.getItem("justVerifiedPayment") === "true";

    console.log(
      "SubscriptionSynchronizer initialized, ready for sync. Coming from payment:",
      comingFromPayment
    );

    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    // Only refresh on initial load or payment completion
    if (!lastRefreshTime.current || comingFromPayment) {
      // But never on subscription page
      if (!isSubscriptionPage.current) {
        console.log(
          "SubscriptionSynchronizer: Initial load or payment completion, refreshing"
        );
        debouncedRefresh(true); // Force refresh for these cases
      } else {
        console.log(
          "SubscriptionSynchronizer: Skipping initial refresh on subscription page"
        );
      }

      // Clear payment-related flags
      if (comingFromPayment) {
        localStorage.removeItem("comingFromPaymentRedirect");
        localStorage.removeItem("justVerifiedPayment");
      }
    }

    // Setup refresh interval for future updates
    const setupRefreshInterval = () => {
      // Never schedule refreshes on subscription page
      if (isSubscriptionPage.current) {
        console.log(
          "SubscriptionSynchronizer: Not scheduling refresh on subscription page"
        );
        return;
      }

      console.log(
        `SubscriptionSynchronizer: Scheduling refresh in ${refreshInterval}ms`
      );
      refreshTimeoutRef.current = setTimeout(() => {
        // Double-check we're still not on subscription page
        if (!isSubscriptionPage.current) {
          console.log("SubscriptionSynchronizer: Scheduled refresh triggered");
          debouncedRefresh(false);
        }
        // Re-schedule for next time
        setupRefreshInterval();
      }, refreshInterval);
    };

    // Start the refresh cycle
    setupRefreshInterval();

    // Clean up on unmount
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [isAuthenticated, authLoading, refreshInterval, refreshSubscriptionData]);

  // This component doesn't render anything
  return null;
};

export default SubscriptionSynchronizer;
