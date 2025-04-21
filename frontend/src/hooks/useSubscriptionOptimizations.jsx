import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useSubscription } from "../context/SubscriptionContext";
import { showToast } from "../utils/toast";
import LoadingSpinner from "../components/LoadingSpinner";

/**
 * Custom hook to add optimizations to the Subscription component
 */
const useSubscriptionOptimizations = () => {
  const { isAuthenticated } = useAuth();
  const { refreshSubscriptionData } = useSubscription();

  const [manualRefreshLoading, setManualRefreshLoading] = useState(false);
  const [showRefreshButton, setShowRefreshButton] = useState(false);
  const [paymentJustCompleted, setPaymentJustCompleted] = useState(false);

  // Check if we're coming from a payment
  useEffect(() => {
    const comingFromPayment =
      localStorage.getItem("comingFromPaymentRedirect") === "true" ||
      localStorage.getItem("justVerifiedPayment") === "true" ||
      localStorage.getItem("showManualRefresh") === "true";

    if (comingFromPayment) {
      setPaymentJustCompleted(true);
      setShowRefreshButton(true);

      // Clear the flags
      localStorage.removeItem("comingFromPaymentRedirect");
      localStorage.removeItem("justVerifiedPayment");
      localStorage.removeItem("showManualRefresh");
    }
  }, []);

  // Handle manual refresh
  const handleManualRefresh = useCallback(async () => {
    if (!isAuthenticated) {
      showToast.info("Please log in to view your subscription details");
      return;
    }

    try {
      setManualRefreshLoading(true);
      await refreshSubscriptionData(true);
      showToast.success("Subscription information updated");
      setShowRefreshButton(false);
    } catch (error) {
      showToast.error("Failed to refresh subscription information");
    } finally {
      setManualRefreshLoading(false);
    }
  }, [isAuthenticated, refreshSubscriptionData]);

  // Render refresh button if needed
  const renderRefreshButton = () => {
    if (!showRefreshButton && !paymentJustCompleted) return null;

    return (
      <div className="mt-4 bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded-md">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-500"
              fill="currentColor"
              viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2h.01a1 1 0 100-2H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">
              {paymentJustCompleted
                ? "Payment completed! Click the button below to refresh your subscription details."
                : "Click the button below to refresh your subscription information."}
            </p>
            <div className="mt-2">
              <button
                onClick={handleManualRefresh}
                disabled={manualRefreshLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition flex items-center">
                {manualRefreshLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    <span>Refreshing...</span>
                  </>
                ) : (
                  <span>Refresh Subscription Details</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return {
    renderRefreshButton,
    handleManualRefresh,
    paymentJustCompleted,
    showRefreshButton,
    manualRefreshLoading,
  };
};

export default useSubscriptionOptimizations;
