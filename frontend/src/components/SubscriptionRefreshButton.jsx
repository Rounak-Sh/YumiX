import React, { useState } from "react";
import { useSubscription } from "../context/SubscriptionContext";
import { showToast } from "../utils/toast";
import LoadingSpinner from "./LoadingSpinner";

/**
 * A button component that allows users to manually refresh subscription data
 * Useful after payment completion
 */
const SubscriptionRefreshButton = ({ className = "" }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { refreshSubscriptionData } = useSubscription();

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      showToast.info("Refreshing subscription data...");

      await refreshSubscriptionData(true);

      showToast.success("Subscription data refreshed successfully");
    } catch (error) {
      console.error("Error refreshing subscription data:", error);
      showToast.error("Failed to refresh subscription data");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      className={`flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 ${className}`}>
      {isRefreshing ? (
        <>
          <LoadingSpinner size="sm" className="mr-2" />
          <span>Refreshing...</span>
        </>
      ) : (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>Refresh Subscription</span>
        </>
      )}
    </button>
  );
};

export default SubscriptionRefreshButton;
