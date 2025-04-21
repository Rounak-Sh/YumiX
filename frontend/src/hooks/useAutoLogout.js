import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { showToast } from "@/utils/toast";

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_TIME = 5 * 60 * 1000; // Show warning 5 minutes before logout

const useAutoLogout = (isAuthenticated) => {
  const navigate = useNavigate();

  const logout = useCallback(() => {
    // Clear all auth-related data
    localStorage.clear();

    // Clear rate limit attempts
    for (let key of Object.keys(localStorage)) {
      if (key.includes("loginAttempts") || key.includes("registerAttempts")) {
        localStorage.removeItem(key);
      }
    }

    // Dispatch event to clear warning
    window.dispatchEvent(new CustomEvent("clearInactivityWarning"));

    showToast.info("You have been logged out due to inactivity");
    navigate("/login");
  }, [navigate]);

  const resetTimer = () => {
    if (!isAuthenticated) return;
    localStorage.setItem("lastActivity", Date.now().toString());
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    let warningTimeout;
    let logoutTimeout;

    const checkInactivity = () => {
      const lastActivity = parseInt(
        localStorage.getItem("lastActivity") || "0"
      );
      const currentTime = Date.now();
      const timeSinceLastActivity = currentTime - lastActivity;

      if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
        logout();
      } else if (timeSinceLastActivity >= INACTIVITY_TIMEOUT - WARNING_TIME) {
        const timeLeft = Math.ceil(
          (INACTIVITY_TIMEOUT - timeSinceLastActivity) / 1000
        );
        const event = new CustomEvent("inactivityWarning", {
          detail: { timeLeft },
        });
        window.dispatchEvent(event);
      }
    };

    const handleActivity = () => {
      resetTimer();
      // Clear the warning when there's activity
      window.dispatchEvent(new CustomEvent("clearInactivityWarning"));
      clearTimeout(warningTimeout);
      clearTimeout(logoutTimeout);

      warningTimeout = setTimeout(() => {
        checkInactivity();
      }, INACTIVITY_TIMEOUT - WARNING_TIME);

      logoutTimeout = setTimeout(() => {
        checkInactivity();
      }, INACTIVITY_TIMEOUT);
    };

    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
    ];

    events.forEach((event) => window.addEventListener(event, handleActivity));
    handleActivity(); // Initialize timers

    return () => {
      events.forEach((event) =>
        window.removeEventListener(event, handleActivity)
      );
      clearTimeout(warningTimeout);
      clearTimeout(logoutTimeout);
    };
  }, [logout, resetTimer, isAuthenticated]);

  return { resetTimer };
};

export default useAutoLogout;
