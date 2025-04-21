import React, { useEffect, useRef } from "react";
import { useSubscription } from "../context/SubscriptionContext";
import { useAuth } from "../context/AuthContext";
import { useLocation } from "react-router-dom";

/**
 * Optimized component that synchronizes subscription data
 * with proper throttling to prevent excessive API calls
 */
const SubscriptionSynchronizerFix = ({ refreshInterval = 5 * 60 * 1000 }) => {
  const { refreshSubscriptionData } = useSubscription();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const location = useLocation();

  // Use refs to track state and prevent excessive refreshes
  const lastRefreshTime = useRef(Date.now());
  const refreshTimeoutRef = useRef(null);
  const isSubscriptionPage = useRef(false);

  // Check if current page is subscription page
  useEffect(() => {
    isSubscriptionPage.current = location.pathname.startsWith("/subscription");
    console.log(
      `SubscriptionSynchronizer: On subscription page: ${isSubscriptionPage.current}`
    );
  }, [location.pathname]);

  // Clean up timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  // Main subscription synchronization effect
  useEffect(() => {
    // Skip if auth is still loading or user is not authenticated
    if (authLoading || !isAuthenticated) {
      console.log(
        "SubscriptionSynchronizer: Not authenticated or still loading, skipping sync"
      );
      return;
    }

    // NEVER refresh on subscription page to prevent loops
    if (isSubscriptionPage.current) {
      console.log(
        "SubscriptionSynchronizer: On subscription page, skipping refresh"
      );
      return;
    }

    // Check if we're coming from payment
    const comingFromPayment =
      localStorage.getItem("comingFromPaymentRedirect") === "true" ||
      localStorage.getItem("justVerifiedPayment") === "true";

    // Only refresh if coming from payment or enough time has passed
    const now = Date.now();
    if (comingFromPayment || now - lastRefreshTime.current > refreshInterval) {
      console.log("SubscriptionSynchronizer: Refreshing subscription data");
      lastRefreshTime.current = now;

      // Clear any existing timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      // Only refresh if coming from payment
      if (comingFromPayment) {
        refreshSubscriptionData(true);

        // Clear payment flags
        localStorage.removeItem("comingFromPaymentRedirect");
        localStorage.removeItem("justVerifiedPayment");
      }
    }

    // Schedule next refresh
    refreshTimeoutRef.current = setTimeout(() => {
      // Double-check we're still not on subscription page
      if (!isSubscriptionPage.current && isAuthenticated) {
        lastRefreshTime.current = Date.now();
        refreshSubscriptionData();
      }
    }, refreshInterval);
  }, [isAuthenticated, authLoading, refreshInterval, refreshSubscriptionData]);

  // This component doesn't render anything
  return null;
};

export default SubscriptionSynchronizerFix;
