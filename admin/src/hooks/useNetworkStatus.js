import { useState, useEffect } from "react";

const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      if (!isOnline) {
        setWasOffline(true);
        setTimeout(() => setWasOffline(false), 3000);
      }
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [isOnline]);

  return {
    isOnline,
    wasOffline,
    canMakeRequests: isOnline,
    message: isOnline
      ? wasOffline
        ? "Back online! Resuming operations..."
        : null
      : "You are offline. Please check your internet connection.",
  };
};

export default useNetworkStatus;
