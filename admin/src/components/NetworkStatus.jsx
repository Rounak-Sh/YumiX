import { useState, useEffect } from "react";

const NetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(window.navigator.onLine);
  const [apiUrl, setApiUrl] = useState("Checking...");
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Get the API URL from the window if available
    if (window.__API_URL__) {
      setApiUrl(window.__API_URL__);
    } else {
      // Try to get it from environment
      const envUrl = import.meta.env.VITE_API_URL;
      if (envUrl) {
        setApiUrl(envUrl);
      } else {
        setApiUrl("Unknown");
      }
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!showDebug) {
    return (
      <div
        className="fixed bottom-2 right-2 bg-gray-800 text-white p-1 text-xs opacity-30 hover:opacity-90 cursor-pointer z-50 rounded"
        onClick={() => setShowDebug(true)}>
        Debug
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 right-0 bg-gray-800 text-white p-2 text-xs z-50 rounded-tl-md">
      <div className="flex flex-col">
        <div className="flex justify-between mb-1">
          <span className="font-bold">Connection Status:</span>
          <button
            className="ml-4 text-gray-400 hover:text-white"
            onClick={() => setShowDebug(false)}>
            ✕
          </button>
        </div>
        <div
          className={`flex items-center ${
            isOnline ? "text-green-400" : "text-red-400"
          }`}>
          <span
            className="h-2 w-2 rounded-full mr-1 inline-block"
            style={{
              backgroundColor: isOnline ? "#4ade80" : "#f87171",
            }}></span>
          <span>{isOnline ? "Online" : "Offline"}</span>
        </div>
        <div className="mt-1">
          <span className="font-bold">API URL:</span>
          <span className="ml-1 break-all">{apiUrl}</span>
        </div>
        <div className="mt-1">
          <span className="font-bold">Host:</span>
          <span className="ml-1">{window.location.hostname}</span>
        </div>
      </div>
    </div>
  );
};

export default NetworkStatus;
