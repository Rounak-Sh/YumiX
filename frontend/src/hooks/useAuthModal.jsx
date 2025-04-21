import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Custom hook to handle authentication modal for specific actions
 * @returns {Object} - Methods and state for auth modal
 */
const useAuthModal = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [featureName, setFeatureName] = useState("");
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Handle action that requires authentication
  const handleAuthAction = (action, feature, redirectPath = null) => {
    if (isAuthenticated) {
      // User is authenticated, perform the action
      if (typeof action === "function") {
        action();
      } else if (redirectPath) {
        navigate(redirectPath);
      }
      return true;
    } else {
      // User is not authenticated, show the modal
      setFeatureName(feature);
      setShowAuthModal(true);
      return false;
    }
  };

  // Close the auth modal
  const closeAuthModal = () => {
    setShowAuthModal(false);
  };

  return {
    showAuthModal,
    featureName,
    handleAuthAction,
    closeAuthModal,
    isAuthenticated,
    setShowAuthModal,
    setFeatureName,
  };
};

export default useAuthModal;
