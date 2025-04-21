import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/solid";

// Cache object to prevent duplicate toasts and track active toast IDs
const toastCache = {};
const activeToasts = new Set();

// Helper function to create toast notifications with duplicate prevention
const createToast = (message, type) => {
  // Create a key based on message and type
  const key = `${message}-${type}-${Date.now()}`;
  const simpleKey = `${message}-${type}`;

  // Check if this toast was shown recently (within 3 seconds)
  const now = Date.now();
  if (toastCache[simpleKey] && now - toastCache[simpleKey] < 3000) {
    // Skip duplicate toast
    return;
  }

  // Update the cache
  toastCache[simpleKey] = now;

  // Clear old cache entries every minute
  if (!window.__toastCacheCleaner) {
    window.__toastCacheCleaner = setInterval(() => {
      const expireTime = Date.now() - 60000; // 1 minute ago
      Object.keys(toastCache).forEach((k) => {
        if (toastCache[k] < expireTime) {
          delete toastCache[k];
        }
      });
    }, 60000);
  }

  // Common toast options to fix removalReason error
  const toastOptions = {
    toastId: key, // Use unique ID per toast to prevent reference issues
    icon: undefined, // Will be set separately below
    className: "!bg-[#252525] !text-white border border-[#323232]",
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    // Ensure proper cleanup before removal
    onOpen: () => {
      // Add this toast ID to active toasts
      activeToasts.add(key);
    },
    onClose: () => {
      // Mark as closed in cache and remove from active toasts
      if (toastCache[simpleKey]) {
        toastCache[simpleKey] = now - 2900; // Mark as almost expired
      }
      activeToasts.delete(key);
    },
  };

  // Determine icon based on type
  let icon;
  let toastId;

  // Safety wrapper to dismiss any existing toasts with errors
  const safelyDismissAll = () => {
    try {
      // Only dismiss active toasts we're tracking
      activeToasts.forEach((id) => {
        try {
          toast.dismiss(id);
        } catch (e) {
          // Ignore errors during dismissal
          console.debug("Ignored toast dismiss error", e);
        }
      });
      activeToasts.clear();
    } catch (e) {
      // Ignore any errors when trying to dismiss all
      console.debug("Could not dismiss all toasts", e);
    }
  };

  // Handle any errors during toast creation
  try {
    switch (type) {
      case "success":
        icon = <CheckCircleIcon className="h-6 w-6 text-green-500" />;
        toastId = toast.success(message, { ...toastOptions, icon: () => icon });
        break;
      case "error":
        icon = <XCircleIcon className="h-6 w-6 text-red-500" />;
        toastId = toast.error(message, { ...toastOptions, icon: () => icon });
        break;
      case "info":
        icon = <InformationCircleIcon className="h-6 w-6 text-blue-500" />;
        toastId = toast.info(message, { ...toastOptions, icon: () => icon });
        break;
      case "warning":
        toastId = toast.warning(message, {
          ...toastOptions,
          icon: "⚠️",
        });
        break;
      default:
        toastId = toast(message, toastOptions);
    }

    // Store the toast ID for potential cleanup
    return toastId;
  } catch (e) {
    console.error("Error creating toast:", e);

    // If we encounter errors with toast creation, try to dismiss all toasts
    // to potentially clear any problematic toast instances
    safelyDismissAll();

    // Return without attempting to create another toast
    return null;
  }
};

// Create a function that can be called with both methods:
// 1. showToast(message, type)
// 2. showToast.success(message), showToast.error(message), etc.
export const showToast = (message, type = "info") => createToast(message, type);

// Add methods to the showToast function
showToast.success = (message) => createToast(message, "success");
showToast.error = (message) => createToast(message, "error");
showToast.info = (message) => createToast(message, "info");
showToast.warning = (message) => createToast(message, "warning");

// Add a method to dismiss all toasts - can be used when changing routes or during errors
showToast.dismissAll = () => {
  try {
    toast.dismiss();
    activeToasts.clear();
  } catch (e) {
    console.debug("Error dismissing all toasts:", e);
  }
};

// Toast container with YuMix styling
export const ToastifyContainer = () => (
  <ToastContainer
    position="top-right"
    autoClose={3000}
    hideProgressBar={false}
    newestOnTop
    closeOnClick
    rtl={false}
    pauseOnFocusLoss={false} // Preventing issues when focus changes
    draggable
    pauseOnHover
    theme="dark"
    limit={3} // Limit number of toasts shown at once to prevent UI clutter
    toastStyle={{
      background: "#252525",
      color: "#fff",
      borderRadius: "8px",
      border: "1px solid #323232",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    }}
    progressStyle={{
      background: "var(--primary-color, #FFCF50)",
    }}
    bodyStyle={{
      fontFamily: "'Inter', sans-serif",
      fontSize: "14px",
    }}
    icon={false}
  />
);
