import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSubscription } from "../context/SubscriptionContext";
import { showToast } from "../utils/toast.jsx";
import AuthModal from "../components/AuthModal";
import LoadingSpinner from "../components/LoadingSpinner";
import useAuthModal from "../hooks/useAuthModal";
import useSubscriptionOptimizations from "../hooks/useSubscriptionOptimizations";
import {
  verifyPayment,
  createOrder,
  clearSubscriptionCache,
} from "../services/subscriptionService";
import { FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";
import { MdPayment } from "react-icons/md";
import { BsLightningChargeFill } from "react-icons/bs";
import { toast } from "react-toastify";
import { CheckIcon } from "@heroicons/react/24/solid";
import { useTheme } from "../context/ThemeContext";
import SubscriptionRefreshButton from "../components/SubscriptionRefreshButton";
import axiosInstance from "../config/axios";

const Subscription = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    showAuthModal,
    setShowAuthModal,
    closeAuthModal,
    setFeatureName,
    featureName,
  } = useAuthModal();

  const {
    plans,
    isSubscribed,
    currentPlan,
    expiryDate,
    remainingSearches,
    maxSearches,
    isLoadingPlans,
    isLoadingStatus,
    refreshSubscriptionData,
    fetchSubscriptionPlans,
  } = useSubscription();

  // Use the subscription optimizations hook
  const {
    renderRefreshButton: optimizedRenderRefreshButton,
    handleManualRefresh: optimizedHandleManualRefresh,
    paymentJustCompleted,
    showRefreshButton,
    manualRefreshLoading,
  } = useSubscriptionOptimizations();

  // UI state variables
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPaymentButtons, setShowPaymentButtons] = useState(false);
  const [selectedPlanDetails, setSelectedPlanDetails] = useState(null);
  const [isLoadingPlanDetails, setIsLoadingPlanDetails] = useState(false);
  const [isRefreshingAfterPayment, setIsRefreshingAfterPayment] =
    useState(false);
  const { darkMode } = useTheme();

  // ... other state variables
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(false);
  const [localActiveSubscription, setLocalActiveSubscription] = useState(false);
  const [comingFromPayment, setComingFromPayment] = useState(false);
  const [error, setError] = useState(null);

  // Add the missing state variable where other state variables are defined
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneModalPlanId, setPhoneModalPlanId] = useState(null);
  const [phoneError, setPhoneError] = useState(null);

  // Add a state variable to track if subscription data has already been requested
  const [subscriptionDataRequested, setSubscriptionDataRequested] =
    useState(false);
  const [paymentProcessed, setPaymentProcessed] = useState(false);

  // Check if we're coming from a payment - use the hook's values
  useEffect(() => {
    if (paymentJustCompleted) {
      setComingFromPayment(true);
    }
  }, [paymentJustCompleted]);

  // Only refresh subscription data if user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshSubscriptionData();
    }
  }, [isAuthenticated, refreshSubscriptionData]);

  // Replace your existing renderRefreshButton with optimized version
  const renderRefreshButton = () => {
    return optimizedRenderRefreshButton();
  };

  // Use the optimized handleManualRefresh for better consistency
  const handleManualRefresh = () => {
    return optimizedHandleManualRefresh();
  };

  // Add diagnostic logging for subscription page access
  useEffect(() => {
    // This ensures we don't get redirected to login when on subscription page
    const preventLoginRedirect = () => {
      // Set a flag in localStorage to indicate we're on the subscription page
      localStorage.setItem("onSubscriptionPage", "true");

      return () => {
        // Clean up when leaving the page
        localStorage.removeItem("onSubscriptionPage");
      };
    };

    return preventLoginRedirect();
  }, []);

  // Handle payment verification more efficiently
  useEffect(() => {
    const checkPaymentStatus = async () => {
      // Check if we're coming from payment gateway redirect
      const comingFromPayment =
        localStorage.getItem("comingFromPaymentRedirect") === "true";
      const paymentVerified =
        localStorage.getItem("paymentVerified") === "true";
      const paymentFailed =
        localStorage.getItem("paymentVerificationFailed") === "true";

      if (comingFromPayment) {
        // Clear redirect flag
        localStorage.removeItem("comingFromPaymentRedirect");

        if (paymentVerified) {
          showToast.success(
            "Payment successful! Your subscription is now active."
          );
          localStorage.removeItem("paymentVerified");

          // Force refresh subscription data but only once
          if (isAuthenticated) {
            refreshSubscriptionData(true);
          }
        } else if (paymentFailed) {
          const errorMsg =
            localStorage.getItem("paymentVerificationError") ||
            "Payment verification failed";
          showToast.error(errorMsg);
          localStorage.removeItem("paymentVerificationFailed");
          localStorage.removeItem("paymentVerificationError");
        }
      }
    };

    checkPaymentStatus();
  }, [isAuthenticated, refreshSubscriptionData]);

  // State variables for UI control and payment processing
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentVerificationAttempted, setPaymentVerificationAttempted] =
    useState(false);
  const [urlParams, setUrlParams] = useState(null);
  const [pendingPaymentInfo, setPendingPaymentInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  // Add an effect specifically to determine subscription state for rendering
  useEffect(() => {
    // Define the subscription status - consider both context and local state
    const activeSubscription = isSubscribed && currentPlan !== null;
    setLocalActiveSubscription(activeSubscription);
  }, [isSubscribed, currentPlan]);

  // Add useEffect to force refresh subscription data on component mount
  useEffect(() => {
    // Force refresh subscription data when component mounts
    const loadData = async () => {
      try {
        setLoading(true);

        // First check if we have the subscription context methods
        if (typeof refreshSubscriptionData === "function") {
          await refreshSubscriptionData(true);
        } else if (typeof fetchSubscriptionPlans === "function") {
          // Fallback: fetch plans directly if context method is not available
          await fetchSubscriptionPlans(true);
        } else {
          setError("Unable to fetch subscription data");
        }
        setLoading(false);
      } catch (err) {
        console.error("Error loading subscription data:", err);
        setError("Failed to load subscription data. Please try again.");
        setLoading(false);
      }
    };

    loadData();
  }, []); // Empty dependency array to run only once on mount

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Actual order creation function
  const handleCreateOrder = async (planId) => {
    try {
      setLoading(true);
      showToast.info("Initializing payment...");

      const response = await createOrder(planId);

      if (response.success && response.data) {
        // Check if payment link is present in response
        if (response.data.paymentLink) {
          showToast.success("Redirecting to payment page...");

          // Store order info in localStorage for verification after return from payment page
          const paymentInfo = {
            orderId: response.data.orderId,
            linkId: response.data.linkId, // Support both order_id and link_id
            planId: planId,
            amount: response.data.amount,
            subscriptionId: response.data.subscriptionId, // Make sure we're using the correct subscriptionId from the server
            paymentId: response.data.paymentId,
            timestamp: Date.now(),
          };

          localStorage.setItem("pendingPayment", JSON.stringify(paymentInfo));

          // Short delay before redirect to ensure toast is visible
          setTimeout(() => {
            // Redirect to Cashfree payment page
            window.location.href = response.data.paymentLink;
          }, 1000);
        } else {
          showToast.error(
            "Payment link not found in the response. Please try again."
          );
          console.error("Missing payment link in response:", response);
        }
      } else {
        // Show detailed error message
        const errorMessage = response.message || "Failed to create order";
        console.error("Order creation failed:", errorMessage, response);

        // Check for specific error types and provide user-friendly messages
        if (errorMessage.includes("already has an active subscription")) {
          showToast.error("You already have an active subscription.");
          refreshSubscriptionData(); // Refresh to show current status
        } else if (errorMessage.includes("Invalid or inactive plan")) {
          showToast.error("This subscription plan is no longer available.");
        } else if (
          errorMessage.toLowerCase().includes("network") ||
          errorMessage.toLowerCase().includes("connection")
        ) {
          showToast.error(
            "Network error. Please check your internet connection and try again."
          );
        } else {
          showToast.error(errorMessage);
        }
      }
    } catch (error) {
      const errorMessage = error.message || "Failed to initiate payment";
      console.error("Subscription error:", errorMessage, error);
      showToast.error("An unexpected error occurred. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Handle subscription purchase
  const handleSubscribe = async (planId) => {
    if (!isAuthenticated) {
      // For unauthenticated users, show the auth modal instead of redirecting
      // Store selected plan ID for after authentication
      localStorage.setItem("selectedPlanAfterAuth", planId);

      // Show auth modal with specific feature name
      setFeatureName("Premium Subscription");
      setShowAuthModal(true);
      return;
    }

    try {
      // Set paymentLoading to true while processing
      setPaymentLoading(true);
      setSelectedPlan(planId);
      setError(null);

      // Now we can use createOrder since it's properly imported
      const response = await createOrder(planId);

      if (response.success) {
        // Store info about pending payment
        const pendingPayment = {
          orderId: response.orderId || response.data?.orderId,
          paymentId: response.paymentId || response.data?.paymentId,
          linkId: response.linkId || response.data?.linkId,
          paymentLink: response.paymentLink || response.data?.paymentLink,
          subscriptionId: response.data?.subscriptionId, // Use correct subscriptionId from server response
          planId: planId, // Keep planId for reference
          timestamp: Date.now(),
        };

        // Save the pending payment info to localStorage
        localStorage.setItem("pendingPayment", JSON.stringify(pendingPayment));

        // Set pending payment info in state
        setPendingPaymentInfo(pendingPayment);

        // Show success message before redirect
        showToast.success("Redirecting to payment gateway...");

        // Short delay to allow toast to be seen
        setTimeout(() => {
          // Redirect to payment URL
          window.location.href =
            response.paymentLink || response.data?.paymentLink;
        }, 2000); // Increased delay to 2 seconds for better visibility
      } else {
        console.error("Error creating order:", response);
        showToast.error(
          response.message || "Failed to create payment. Please try again."
        );
        setError(response.message || "Failed to create payment");
      }
    } catch (error) {
      console.error("Error subscribing:", error);
      showToast.error(
        "An error occurred while processing your request. Please try again."
      );
      setError("An unexpected error occurred");
    } finally {
      // Set paymentLoading back to false when complete
      setPaymentLoading(false);
      setLoading(false);
    }
  };

  // Add a ref to track if verification has been attempted in this session
  const verificationAttemptedRef = useRef(false);

  // Update the loading effect to prevent flickering
  useEffect(() => {
    // Only set loading if not already loading (prevent state thrashing)
    const shouldBeLoading =
      isLoadingStatus ||
      isLoadingPlans ||
      (comingFromPayment && !paymentProcessed);

    // Only update state if it's changing to avoid re-renders
    if (isLoadingSubscription !== shouldBeLoading) {
      setIsLoadingSubscription(shouldBeLoading);
    }

    // Add a safety timeout to prevent infinite loading
    if (comingFromPayment) {
      const timeout = setTimeout(() => {
        setComingFromPayment(false);
      }, 5000); // 5 second safety timeout (reduced from 10)

      return () => clearTimeout(timeout);
    }
  }, [
    isLoadingStatus,
    isLoadingPlans,
    comingFromPayment,
    paymentProcessed,
    isLoadingSubscription,
  ]);

  // Update the URL parameter effect with stable verification handling
  useEffect(() => {
    // Use the ref to track if verification has been attempted in this session
    const params = new URLSearchParams(location.search);
    const orderId = params.get("order_id");
    const linkId = params.get("link_id");

    setUrlParams(params);

    // Only proceed if we have order or link ID and haven't attempted verification yet
    if (
      (orderId || linkId) &&
      !verificationAttemptedRef.current &&
      !paymentProcessed
    ) {
      // Check for pending payment info
      const pendingPaymentStr = localStorage.getItem("pendingPayment");
      if (pendingPaymentStr) {
        try {
          const pendingPayment = JSON.parse(pendingPaymentStr);
          setPendingPaymentInfo(pendingPayment);

          // Mark verification as attempted for this session
          verificationAttemptedRef.current = true;
          setPaymentVerificationAttempted(true);

          // Clean URL parameters without affecting browser history
          // Do this early to prevent multiple verification attempts
          window.history.replaceState({}, document.title, "/subscription");

          // Create verification parameters
          const verificationParams = {
            orderId,
            linkId,
            subscriptionId: pendingPayment.subscriptionId,
            paymentId: pendingPayment.paymentId,
          };

          // Verify payment with a short delay to allow state to settle
          setTimeout(() => {
            handlePaymentVerification(verificationParams);
          }, 100);
        } catch (error) {
          console.error("Error parsing pending payment info:", error);
          setIsRefreshingAfterPayment(false);
        }
      } else {
        // No pending payment info but we have URL parameters
        verificationAttemptedRef.current = true;
        setPaymentVerificationAttempted(true);
        window.history.replaceState({}, document.title, "/subscription");
      }
    }
  }, [location.search, paymentProcessed]);

  // Manual payment verification
  const handleManualVerification = async () => {
    if (paymentProcessing) return;

    try {
      setPaymentProcessing(true);

      // Get payment params from URL if available
      const urlOrderId = urlParams?.get("order_id") || null;
      const urlLinkId = urlParams?.get("link_id") || null;

      // Use stored payment info as fallback
      const storedInfo = pendingPaymentInfo || {};

      // Construct verification params, prioritizing URL parameters
      const orderId = urlOrderId || storedInfo.orderId;
      const linkId = urlLinkId || storedInfo.linkId;

      if (!user.subscriptionId) {
        showToast.error(
          "Missing subscription ID. Please refresh the page and try again."
        );
        return;
      }

      // Call the verifyPayment function with the appropriate parameters
      const result = await verifyPayment(user.subscriptionId, orderId, linkId);

      if (result.success) {
        showToast.success("Payment verified successfully!");

        // Force refresh subscription status
        await refreshSubscriptionData(true);

        // Clear pending payment info if verification was successful
        localStorage.removeItem("pendingPaymentInfo");

        setPaymentProcessing(false);
      } else {
        // Show appropriate error message based on the error code
        if (result.errorCode === "SERVICE_UNAVAILABLE") {
          showToast.error(
            "Payment verification service is currently unavailable. Please try again later."
          );
        } else if (result.errorCode === "ENDPOINT_NOT_FOUND") {
          showToast.error(
            "Payment verification endpoint not found. This may be a configuration issue."
          );
        } else if (result.errorCode === "MISSING_PARAMETERS") {
          showToast.error(
            "Missing required payment information. Please check your payment details."
          );
        } else {
          showToast.error(
            result.message ||
              "Payment verification failed. Please try again later."
          );
        }

        setPaymentProcessing(false);
      }
    } catch (error) {
      console.error("Error in manual payment verification:", error);
      showToast.error("An unexpected error occurred. Please try again later.");
      setPaymentProcessing(false);
    }
  };

  const handlePaymentVerification = async (verificationParams) => {
    // Avoid duplicate verification attempts
    if (paymentProcessing || paymentProcessed) {
      console.log("Payment verification already in progress or completed");
      return;
    }

    if (!verificationParams) {
      console.error("No verification parameters provided");
      showToast.error("Missing payment verification information");
      return;
    }

    try {
      setPaymentProcessing(true);
      setPaymentProcessed(true); // Mark as processed to prevent duplicate attempts
      // Show only one informational message during the entire process
      showToast.info("Processing your payment verification...");

      // Make the API call to verify payment
      const response = await verifyPayment(verificationParams);

      if (response.success) {
        // Set successful payment flags
        localStorage.setItem("justVerifiedPayment", "true");
        localStorage.setItem("showManualRefresh", "true");

        // Clear pending payment info
        localStorage.removeItem("pendingPayment");
        setPendingPaymentInfo(null);

        // Show success message - this is the ONLY success message we'll show
        showToast.success("Payment verified successfully!");

        // Refresh subscription data only once
        if (!subscriptionDataRequested) {
          setSubscriptionDataRequested(true);

          try {
            // Single request to refresh data
            await refreshSubscriptionData(true);

            // After successful refresh, update UI state
            setTimeout(() => {
              setIsLoadingSubscription(false);
              setPaymentProcessing(false);
              setIsRefreshingAfterPayment(false);
            }, 1000); // Use a shorter timeout to reduce perceived wait time
          } catch (error) {
            console.error("Error refreshing subscription data:", error);
            showToast.warning(
              "Please reload the page to see your updated subscription status."
            );
            setIsLoadingSubscription(false);
            setPaymentProcessing(false);
            setIsRefreshingAfterPayment(false);
          }
        }
      } else {
        console.warn("Payment verification failed:", response);

        // Handle specific error codes with user-friendly messages
        if (response.errorCode === "CONNECTION_ERROR") {
          showToast.error(
            "Connection issue. Please check your internet connection and try again."
          );
        } else if (response.errorCode === "UNAUTHORIZED") {
          showToast.error(
            "Session expired. Please log in again to verify your payment."
          );
        } else if (response.errorCode === "ENDPOINT_NOT_FOUND") {
          showToast.error(
            "Service temporarily unavailable. Please try again later."
          );
        } else {
          showToast.error(response.message || "Payment verification failed");
        }

        setPaymentProcessing(false);
        setIsRefreshingAfterPayment(false);
      }
    } catch (error) {
      console.error("Error in payment verification outer block:", error);
      showToast.error("An unexpected error occurred. Please try again later.");
      setPaymentProcessing(false);
      setIsRefreshingAfterPayment(false);
    }
  };

  // Improve comparePlan to be more robust
  const comparePlan = (planToCompare) => {
    // If either plan is null/undefined, they can't match
    if (!planToCompare) {
      return false;
    }

    if (!currentPlan) {
      return false;
    }

    // Multiple methods of comparison to maximize chances of correct identification

    // Check ID match (most reliable)
    if (currentPlan._id && planToCompare._id) {
      if (currentPlan._id === planToCompare._id) {
        return true;
      }
    }

    // Check name match (case-insensitive)
    if (currentPlan.name && planToCompare.name) {
      const currentNameLower = currentPlan.name.toLowerCase();
      const compareNameLower = planToCompare.name.toLowerCase();

      if (currentNameLower === compareNameLower) {
        return true;
      }
    }

    // Check planType match
    if (currentPlan.planType && planToCompare.planType) {
      if (currentPlan.planType === planToCompare.planType) {
        return true;
      }
    }

    return false;
  };

  // Update the checkPaymentParams function
  useEffect(() => {
    const checkPaymentParams = async () => {
      // Check if there are payment-related URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const orderId = urlParams.get("order_id");
      const linkId = urlParams.get("link_id");

      // Use the ref to prevent multiple verification attempts
      if (
        (orderId || linkId) &&
        !verificationAttemptedRef.current &&
        !paymentProcessed
      ) {
        try {
          // Set loading state once
          setIsRefreshingAfterPayment(true);

          // Mark this verification as attempted immediately to prevent duplicate calls
          verificationAttemptedRef.current = true;

          // Clear browser URL parameters immediately to prevent repeated processing
          window.history.replaceState({}, document.title, "/subscription");

          // Set flag to indicate we're coming from a payment
          localStorage.setItem("comingFromPaymentRedirect", "true");

          // Get pending payment info from localStorage
          const pendingPaymentStr = localStorage.getItem("pendingPayment");
          let pendingPayment = null;

          if (pendingPaymentStr) {
            try {
              pendingPayment = JSON.parse(pendingPaymentStr);
            } catch (error) {
              console.error("Error parsing pending payment info:", error);
            }
          }

          // If we don't have pending payment info but have URL parameters,
          // create a new pendingPayment object with the URL parameters
          if (!pendingPayment) {
            pendingPayment = {
              orderId: orderId || null,
              linkId: linkId || null,
              timestamp: Date.now(),
            };

            // We still need a subscriptionId - check if we have one in localStorage
            const selectedPlanId = localStorage.getItem(
              "selectedPlanAfterAuth"
            );
            if (selectedPlanId) {
              pendingPayment.subscriptionId = selectedPlanId;
              pendingPayment.planId = selectedPlanId;
            }
          }

          // Save the updated pending payment info
          localStorage.setItem(
            "pendingPayment",
            JSON.stringify(pendingPayment)
          );

          // Set in state
          setPendingPaymentInfo(pendingPayment);

          // Verify the payment if we have enough information
          if (
            (pendingPayment.orderId || pendingPayment.linkId) &&
            (pendingPayment.subscriptionId || pendingPayment.planId)
          ) {
            // Prepare verification parameters
            const verifyParams = {};

            if (pendingPayment.orderId) {
              verifyParams.orderId = pendingPayment.orderId;
            }

            if (pendingPayment.linkId) {
              verifyParams.linkId = pendingPayment.linkId;
            }

            // Use either subscriptionId or planId (in that order of preference)
            if (pendingPayment.subscriptionId) {
              verifyParams.subscriptionId = pendingPayment.subscriptionId;
            } else if (pendingPayment.planId) {
              verifyParams.subscriptionId = pendingPayment.planId;
            }

            if (pendingPayment.paymentId) {
              verifyParams.paymentId = pendingPayment.paymentId;
            }

            // Process the payment verification with a small delay to ensure state is settled
            setTimeout(() => {
              handlePaymentVerification(verifyParams);
            }, 100);
          } else {
            // We don't have enough information for verification
            setIsRefreshingAfterPayment(false);
            showToast.warning(
              "Payment information incomplete. Please use manual verification if needed."
            );

            // Set flag to show the manual refresh button
            localStorage.setItem("showManualRefresh", "true");
            setShowRefreshButton(true);
          }
        } catch (error) {
          console.error("Error during auto payment verification:", error);
          setIsRefreshingAfterPayment(false);
          showToast.error(
            "An error occurred while verifying your payment. Please try manual verification."
          );

          // Set flag to show the manual refresh button
          localStorage.setItem("showManualRefresh", "true");
          setShowRefreshButton(true);
        }
      }
    };

    // Only run this effect when the component mounts and URL contains payment params
    if (
      (location.search.includes("order_id") ||
        location.search.includes("link_id")) &&
      !paymentProcessed
    ) {
      checkPaymentParams();
    }
  }, [location.search, paymentProcessed]);

  // Clear pending payment info
  const clearPendingPayment = () => {
    localStorage.removeItem("pendingPayment");
    setPendingPaymentInfo(null);
    setPaymentVerificationAttempted(false);
    showToast.info("Payment information cleared");
  };

  // Render payment verification UI with the refresh button
  const renderPaymentVerification = () => {
    if (!pendingPaymentInfo) return null;

    // Format the timestamp from pendingPaymentInfo
    const timestamp = new Date(pendingPaymentInfo.timestamp).toLocaleString();

    return (
      <div className="mt-6 bg-blue-50 border border-blue-200 p-4 rounded-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0 mt-1">
            <MdPayment className="h-5 w-5 text-blue-500" />
          </div>
          <div className="ml-3 w-full">
            <h3 className="text-lg font-medium text-blue-800">
              Pending Payment
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <div className="space-y-1">
                <p>
                  You have a pending payment initiated on{" "}
                  <span className="font-bold">{timestamp}</span>. If your
                  payment was successful but your subscription isn't active yet,
                  you can:
                </p>
                <div className="mt-3 p-2 bg-white rounded-md border border-blue-100">
                  <p className="text-xs text-gray-500">Payment details:</p>
                  {pendingPaymentInfo.orderId && (
                    <p className="text-sm">
                      <span className="font-medium">Order ID:</span>{" "}
                      {pendingPaymentInfo.orderId}
                    </p>
                  )}
                  {pendingPaymentInfo.linkId && (
                    <p className="text-sm">
                      <span className="font-medium">Link ID:</span>{" "}
                      {pendingPaymentInfo.linkId}
                    </p>
                  )}
                  {pendingPaymentInfo.subscriptionId && (
                    <p className="text-sm">
                      <span className="font-medium">Plan:</span>{" "}
                      {pendingPaymentInfo.subscriptionId}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {paymentProcessing ? (
                <button
                  disabled
                  className="bg-yellow-500 text-white px-4 py-2 rounded text-sm transition flex items-center">
                  <LoadingSpinner size="sm" className="mr-2" />
                  <span>Verifying payment...</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => manuallyVerifyPendingPayment()}
                    disabled={paymentProcessing}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded text-sm transition flex items-center">
                    <span>Verify Payment</span>
                  </button>
                  <SubscriptionRefreshButton className="bg-blue-500 hover:bg-blue-600" />
                </>
              )}
              <button
                onClick={clearPendingPayment}
                disabled={paymentProcessing}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded text-sm transition">
                Clear Payment Info
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Function for manual payment verification
  const manuallyVerifyPendingPayment = async () => {
    if (!pendingPaymentInfo) {
      showToast.warning("No pending payment information found.");
      return;
    }

    // Don't set paymentProcessing here, handlePaymentVerification will do that
    showToast.info("Verifying payment...");

    try {
      // Extract payment identifiers
      const orderId = pendingPaymentInfo.orderId;
      const linkId = pendingPaymentInfo.linkId;

      // For subscription ID, use either subscriptionId or planId (in that order)
      // Note: subscriptionId should be the actual subscription document ID from the backend
      // planId should only be used as a last resort and may cause errors
      const subscriptionId = pendingPaymentInfo.subscriptionId;
      const planId = pendingPaymentInfo.planId;
      const paymentId = pendingPaymentInfo.paymentId;

      // At least one of orderId or linkId must be present
      if (!orderId && !linkId) {
        showToast.error("Missing payment identifiers (orderId or linkId)");
        console.error(
          "Manual verification failed: Missing payment identifiers"
        );
        return;
      }

      // Ensure we have the subscription ID
      if (!subscriptionId) {
        showToast.error(
          "Missing subscription ID. Please try purchasing again."
        );
        console.error("Manual verification failed: Missing subscriptionId");
        return;
      }

      // Prepare verification parameters - only include properties with values
      const verifyParams = {};

      if (orderId) {
        verifyParams.orderId = orderId;
      }

      if (linkId) {
        verifyParams.linkId = linkId;
      }

      if (subscriptionId) {
        verifyParams.subscriptionId = subscriptionId;
      }

      if (paymentId) {
        verifyParams.paymentId = paymentId;
      }

      // Use our optimized handlePaymentVerification function
      await handlePaymentVerification(verifyParams);
    } catch (error) {
      console.error("Error during manual verification:", error);
      showToast.error("An error occurred during manual verification");
    }
  };

  // Initialize URL parameters when component mounts
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    setUrlParams(searchParams);

    // Check if we have order_id or link_id in the URL
    const orderIdParam = searchParams.get("order_id");
    const linkIdParam = searchParams.get("link_id");

    if (orderIdParam || linkIdParam) {
      // If we have URL parameters, auto-trigger verification
      if (user && user.subscriptionId && !paymentProcessing) {
        handleManualVerification();
      }
    }
  }, [location.search, user]);

  // Replace destructured plan with a computed one that updates when currentPlan changes
  const getPlan = useCallback(() => currentPlan || {}, [currentPlan]);

  // Render active subscription card with improved design
  const renderActiveSubscription = () => (
    <div className="bg-white rounded-xl overflow-hidden shadow-md">
      <div className="bg-[#23486A] p-5 text-white">
        <h2 className="text-2xl font-bold flex items-center">
          <span className="bg-yellow-400 text-[#1E3A8A] rounded-full p-1 mr-3 flex items-center justify-center w-8 h-8">
            ✓
          </span>
          Active Subscription: {currentPlan?.name || "Pro Plan"}
        </h2>
      </div>

      <div className="p-6">
        <div className="space-y-6">
          <div className="flex flex-col">
            <p className="text-gray-600 mb-1 text-sm">Subscription Status</p>
            <div className="flex items-center">
              <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
              <span className="text-lg font-semibold text-green-700">
                Active
              </span>
            </div>
          </div>

          <div className="flex flex-col">
            <p className="text-gray-600 mb-1 text-sm">Valid Until</p>
            <p className="text-lg font-semibold text-gray-800">
              {formatDate(expiryDate)}
            </p>
          </div>

          <div className="flex flex-col">
            <p className="text-gray-600 mb-1 text-sm">Daily Recipe Searches</p>
            <div className="flex items-center justify-between">
              <p className="text-lg font-semibold text-gray-800">
                {remainingSearches} remaining searches today
              </p>

              {remainingSearches === 0 && (
                <span className="bg-red-100 text-red-700 text-xs font-medium px-2.5 py-1 rounded border border-red-200">
                  Limit Reached
                </span>
              )}

              {remainingSearches > 0 && remainingSearches <= 3 && (
                <span className="bg-yellow-100 text-yellow-700 text-xs font-medium px-2.5 py-1 rounded border border-yellow-200">
                  Running Low
                </span>
              )}

              {remainingSearches > 3 && (
                <span className="bg-green-100 text-green-700 text-xs font-medium px-2.5 py-1 rounded border border-green-200">
                  Good to Go
                </span>
              )}
            </div>

            {/* Progress bar for remaining searches */}
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
              <div
                className={`h-2.5 rounded-full ${
                  remainingSearches === 0
                    ? "bg-red-500"
                    : remainingSearches <= 3
                    ? "bg-yellow-500"
                    : "bg-green-500"
                }`}
                style={{
                  width: `${(remainingSearches / maxSearches) * 100}%`,
                }}></div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex justify-end space-x-3">
          {showRefreshButton && (
            <button
              onClick={handleManualRefresh}
              disabled={manualRefreshLoading}
              className="flex items-center justify-center px-4 py-2 border border-[#23486A] rounded-lg text-[#23486A] hover:bg-[#23486A]/5 transition-all">
              {manualRefreshLoading ? (
                <span className="flex items-center">
                  <span className="mr-2">⟳</span>
                  Refreshing...
                </span>
              ) : (
                <span className="flex items-center">
                  <span className="mr-2">⟳</span>
                  Refresh Status
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // Add back the forceLoadCompletion function
  const forceLoadCompletion = async () => {
    // Clear all loading states at once
    setIsLoadingSubscription(false);
    setIsRefreshingAfterPayment(false);
    setLoading(false);
    setPaymentProcessing(false);
    setPaymentProcessed(true); // Mark as processed to prevent further attempts

    try {
      // Do one final refresh attempt
      await refreshSubscriptionData(true);
      showToast.success("Subscription data loaded");
    } catch (error) {
      console.error("Error during force refresh:", error);
      // Don't show error message if we're skipping loading
    }
  };

  // Add a function to check if the backend server is running
  const checkBackendStatus = async () => {
    showToast.info("Checking backend connection...");
    try {
      const response = await axiosInstance.get("/health");
      showToast.success("Backend server is running! 🎉");
      return true;
    } catch (error) {
      console.error("Backend server check failed:", error);

      // Check if the error contains a specific message pattern
      if (error.isConnectionError || error.message?.includes("Network Error")) {
        showToast.error(
          "Cannot connect to backend server. Please check if it's running."
        );
      } else {
        showToast.error(
          `Backend server error: ${error.message || "Unknown error"}`
        );
      }
      return false;
    }
  };

  // Function to force restart the connection
  const forceReconnect = async () => {
    showToast.info("Attempting to reconnect to backend...");

    // Try to check backend status
    const isBackendUp = await checkBackendStatus();

    if (isBackendUp) {
      // If backend is up, try to refresh subscription data
      try {
        await refreshSubscriptionData(true);
        showToast.success("Connection restored and data refreshed!");
      } catch (error) {
        console.error("Error refreshing subscription data:", error);
        showToast.warning(
          "Backend is running but data refresh failed. Try again in a moment."
        );
      }
    } else {
      showToast.error(
        "Still unable to connect to backend. Please check if server is running."
      );
    }
  };

  // Create a function to render a single plan item
  const renderPlanItem = (planItem, index) => {
    // Make sure planItem is valid
    if (!planItem || !planItem._id) {
      return null;
    }

    // Multiple ways to determine if this is the current plan
    const planId = currentPlan?._id;
    const planName = currentPlan?.name;

    // Check if this is the current plan
    const isCurrentPlan =
      isSubscribed && (planItem._id === planId || planItem.name === planName);

    // First check if the user is subscribed at all
    return (
      <div
        key={planItem._id}
        className={`bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 ${
          selectedPlan === planItem._id
            ? "ring-2 ring-[#FFCF50] transform scale-[1.02]"
            : "hover:shadow-xl"
        } ${isCurrentPlan ? "border-2 border-green-500" : ""}`}
        onClick={() => setSelectedPlan(planItem._id)}>
        {isCurrentPlan && (
          <div className="bg-green-100 text-green-800 text-center py-1.5 font-medium text-sm">
            Your Current Plan
          </div>
        )}

        <div
          className={`${
            planItem.featured
              ? "bg-gradient-to-r from-[#23486A] to-[#1A3A5F]"
              : "bg-[#23486A]"
          } text-white p-5 relative`}>
          {planItem.featured && (
            <span className="absolute top-0 right-0 bg-[#FFCF50] text-[#23486A] text-xs font-bold px-3 py-1 uppercase translate-x-2 -translate-y-0.5 transform rotate-12 shadow-md">
              Popular
            </span>
          )}

          <h3 className="text-xl font-bold flex items-center">
            {planItem.name || "Subscription Plan"}
          </h3>
          <p className="text-sm opacity-90 mt-1">{planItem.description}</p>
        </div>

        {/* Plan Cost */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-baseline">
            <span className="text-3xl font-bold text-[#23486A]">
              ₹{planItem.price.toFixed(2)}
            </span>
            <span className="text-gray-500 ml-2">/ month</span>
          </div>

          {planItem.discountPercentage > 0 && (
            <div className="mt-2 flex items-center">
              <span className="text-sm line-through text-gray-400 mr-2">
                ₹
                {(
                  (planItem.price * 100) /
                  (100 - planItem.discountPercentage)
                ).toFixed(2)}
              </span>
              <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded">
                Save {planItem.discountPercentage}%
              </span>
            </div>
          )}
        </div>

        {/* Plan Features */}
        <div className="p-5">
          <h4 className="font-semibold text-gray-700 mb-3">Features</h4>
          <ul className="space-y-3 mb-6">
            {Array.isArray(planItem.features) &&
              planItem.features.map((feature, featureIndex) => (
                <li key={featureIndex} className="flex items-start">
                  <span className="rounded-full bg-green-100 p-1 mr-3 text-green-600 flex-shrink-0 w-5 h-5 flex items-center justify-center">
                    ✓
                  </span>
                  <span className="text-gray-600 text-sm">
                    {/* Check if the feature mentions "searches per day" and handle unlimited case */}
                    {feature.includes("searches per day") &&
                    planItem.maxSearchesPerDay === 999999
                      ? "Unlimited searches per day"
                      : feature}
                  </span>
                </li>
              ))}
            {/* Add display for maxSearchesPerDay if it's not already in features */}
            {planItem.maxSearchesPerDay &&
              !planItem.features.some((f) =>
                f.includes("searches per day")
              ) && (
                <li className="flex items-start">
                  <span className="rounded-full bg-green-100 p-1 mr-3 text-green-600 flex-shrink-0 w-5 h-5 flex items-center justify-center">
                    ✓
                  </span>
                  <span className="text-gray-600 text-sm">
                    {planItem.maxSearchesPerDay === 999999
                      ? "Unlimited searches per day"
                      : `${planItem.maxSearchesPerDay} searches per day`}
                  </span>
                </li>
              )}
          </ul>
        </div>

        {/* Subscribe Button */}
        <div className="px-5 pb-5">
          <button
            className={`w-full py-2.5 px-4 rounded-lg transition-colors font-medium ${
              isCurrentPlan
                ? "bg-gray-100 text-gray-500 cursor-default"
                : "bg-[#FFCF50] hover:bg-[#F7B500] text-[#23486A] shadow-md"
            }`}
            disabled={isCurrentPlan || loading}
            onClick={(e) => {
              e.stopPropagation();
              if (!isCurrentPlan) {
                handleSubscribe(planItem._id);
              }
            }}>
            {isCurrentPlan ? "Current Plan" : "Subscribe"}
          </button>
        </div>
      </div>
    );
  };

  // Available Plans section
  const renderAvailablePlans = () => (
    <div className="mt-10">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <div className="flex-shrink-0 w-8 h-8 bg-[#FFCF50] text-[#23486A] flex items-center justify-center rounded-md">
            <svg
              className="w-5 h-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white">Available Plans</h2>
        </div>
        <p className="text-white/80 ml-11">
          Choose the plan that best fits your cooking adventures
        </p>
      </div>

      {isLoadingPlans ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl shadow-lg overflow-hidden animate-pulse">
              <div className="bg-gray-300 h-32 w-full"></div>
              <div className="p-5">
                <div className="h-8 bg-gray-300 rounded-md w-2/3 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded-md w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded-md w-5/6 mb-6"></div>
                <div className="h-10 bg-gray-300 rounded-md w-full"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.isArray(plans) && plans.length > 0 ? (
            plans.map((plan, index) => renderPlanItem(plan, index))
          ) : (
            <div className="col-span-full bg-white rounded-xl p-8 shadow-md text-center">
              <div className="text-[#23486A] mb-4">
                <svg
                  className="w-16 h-16 mx-auto opacity-50"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-[#23486A] mb-2">
                No Plans Available
              </h3>
              <p className="text-gray-600 mb-4">
                We couldn't find any subscription plans at the moment.
              </p>
              <button
                onClick={handleManualRefresh}
                disabled={loading}
                className="px-4 py-2 bg-[#FFCF50] text-[#23486A] font-medium rounded-lg shadow-sm hover:bg-[#F7B500] transition-colors">
                Refresh Plans
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Loading indicator at the top level - only show when truly needed
  if (
    (isLoadingPlans ||
      loading ||
      isLoadingStatus ||
      isRefreshingAfterPayment) &&
    !paymentProcessed
  ) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md w-full">
          <LoadingSpinner size="lg" />
          <h3 className="mt-4 text-lg font-medium text-[#23486A]">
            {isRefreshingAfterPayment
              ? "Verifying Payment"
              : "Loading Subscription Data"}
          </h3>
          {isRefreshingAfterPayment ? (
            <p className="mt-2 text-gray-600">
              We're verifying your payment and updating your subscription...
            </p>
          ) : (
            <p className="mt-2 text-gray-600">
              Loading your subscription information...
            </p>
          )}
          <div className="mt-6 flex flex-col gap-2 items-center">
            <button
              onClick={forceLoadCompletion}
              className="w-full bg-[#23486A] hover:bg-[#1A3A5F] text-white px-4 py-2 rounded-lg text-sm transition shadow-sm">
              Skip loading
            </button>
            <button
              onClick={checkBackendStatus}
              className="w-full bg-[#FFCF50] hover:bg-[#F7B500] text-[#23486A] font-medium px-4 py-2 rounded-lg text-sm transition shadow-sm">
              Check connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Add handleLogout function at an appropriate place in the component
  const handleLogout = () => {
    if (typeof logout === "function") {
      logout();
      navigate("/");
    } else {
      showToast.error("Logout function not available");
    }
  };

  return (
    <div className="min-h-screen relative">
      <div className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
        {/* Header Section - Blue background with subscription title */}
        <div className="bg-[#23486A] rounded-xl overflow-hidden shadow-lg mb-8">
          <div className="p-8 md:p-10 relative">
            {/* Simple diamond icon instead of SVG */}
            <div className="absolute right-10 top-10 text-[#FFCF50] opacity-20 text-6xl">
              ◆
            </div>

            <div className="flex items-center mb-4">
              <div className="bg-[#FFCF50] p-2 rounded-lg mr-4 shadow-md w-12 h-12 flex items-center justify-center">
                <span className="text-[#23486A] text-2xl">★</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white">
                Subscription Plans
              </h1>
            </div>
            <p className="text-white/80 text-lg max-w-2xl">
              Upgrade your membership to unlock premium features and enhanced
              recipe access.
            </p>
          </div>
        </div>

        {/* Content directly on the patterned background */}
        <div className="space-y-8">
          {/* Display payment verification UI if needed */}
          {comingFromPayment && !paymentVerificationAttempted && (
            <div className="mb-8">{renderPaymentVerification()}</div>
          )}

          {/* Show user's active subscription if they have one */}
          {isSubscribed && !isLoadingSubscription && renderActiveSubscription()}

          {/* Plans Section */}
          {renderAvailablePlans()}
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={closeAuthModal}
        featureName={featureName}
      />
    </div>
  );
};

export default Subscription;
