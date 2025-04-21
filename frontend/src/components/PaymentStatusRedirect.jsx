import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { showToast } from "../utils/toast";
import LoadingSpinner from "./LoadingSpinner";

/**
 * Component that handles redirection from payment gateway callback
 * Preserves URL parameters like order_id or link_id when redirecting
 */
const PaymentStatusRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const [processingStep, setProcessingStep] = useState("Initializing");

  useEffect(() => {
    const processPayment = async () => {
      try {
        // Show processing message
        showToast.info("Processing payment information...");
        setIsProcessing(true);
        setProcessingStep("Processing payment information");

        // Get the query parameters
        const urlParams = new URLSearchParams(location.search);
        const orderId = urlParams.get("order_id");
        const linkId = urlParams.get("link_id");

        // Store these parameters in localStorage in case they're lost during redirect
        if (orderId || linkId) {
          const paymentParams = { orderId, linkId, timestamp: Date.now() };
          localStorage.setItem(
            "paymentRedirectParams",
            JSON.stringify(paymentParams)
          );
        }

        // Check if we have pending payment in localStorage
        const pendingPaymentStr = localStorage.getItem("pendingPayment");
        if (!pendingPaymentStr) {
          showToast.warning(
            "Payment information not found - redirecting to subscription page"
          );
        } else {
          try {
            const pendingPayment = JSON.parse(pendingPaymentStr);

            // Update pendingPayment with the URL parameters if they exist
            if (orderId && !pendingPayment.orderId) {
              pendingPayment.orderId = orderId;
              localStorage.setItem(
                "pendingPayment",
                JSON.stringify(pendingPayment)
              );
            }
            if (linkId && !pendingPayment.linkId) {
              pendingPayment.linkId = linkId;
              localStorage.setItem(
                "pendingPayment",
                JSON.stringify(pendingPayment)
              );
            }
          } catch (parseError) {
            setError("Error processing payment information");
          }
        }

        // Set flag to indicate we're coming from payment redirect
        localStorage.setItem("comingFromPaymentRedirect", "true");

        // Set flag to show manual refresh button
        localStorage.setItem("showManualRefresh", "true");

        // Redirect to subscription page with the payment parameters preserved
        setProcessingStep("Redirecting to subscription page");
        redirectToSubscription(location.search);
      } catch (err) {
        setError(
          "An error occurred while processing the payment. Redirecting to subscription page."
        );

        // Redirect anyway after a delay
        setTimeout(() => {
          redirectToSubscription(location.search);
        }, 2000);
      }
    };

    processPayment();
  }, [navigate, location.search]);

  const redirectToSubscription = (queryParams) => {
    navigate(`/subscription${queryParams}`, { replace: true });
    setIsProcessing(false);
  };

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center bg-red-100 border border-red-400 text-red-700 px-8 py-6 rounded-lg max-w-md">
          <h2 className="text-xl font-bold mb-4">Payment Processing Error</h2>
          <p className="mb-4">{error}</p>
          <p className="mb-4 text-sm">
            You will be redirected to the subscription page shortly.
          </p>
          <div className="w-12 h-12 border-b-2 border-red-500 rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-md">
        <LoadingSpinner size="xl" color="border-[#FFCF50]" />
        <h2 className="text-xl font-bold text-[#23486A] mt-4 mb-2">
          Processing Payment
        </h2>
        <p className="text-gray-700 mb-2">
          <span className="font-medium">{processingStep}...</span>
        </p>
        <p className="text-gray-500 text-sm mt-2">
          {isProcessing
            ? "This may take a few moments. Please don't close this page."
            : "Redirecting you to the subscription page..."}
        </p>
      </div>
    </div>
  );
};

export default PaymentStatusRedirect;
