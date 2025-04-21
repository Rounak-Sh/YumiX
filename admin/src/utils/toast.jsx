import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/solid";

// Export the toast functions with custom configurations
export const showToast = {
  success: (message) => {
    toast.success(message, {
      icon: () => <CheckCircleIcon className="h-6 w-6 text-green-500" />,
      className: "!bg-[#252525] !text-white border border-[#323232]",
    });
  },
  error: (message) => {
    toast.error(message, {
      icon: () => <XCircleIcon className="h-6 w-6 text-red-500" />,
      className: "!bg-[#252525] !text-white border border-[#323232]",
    });
  },
  info: (message) => {
    toast.info(message, {
      icon: () => <InformationCircleIcon className="h-6 w-6 text-blue-500" />,
      className: "!bg-[#252525] !text-white border border-[#323232]",
    });
  },
  warning: (message) => {
    toast.warning(message, {
      icon: "⚠️",
      className: "flex items-center",
    });
  },
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
    pauseOnFocusLoss
    draggable
    pauseOnHover
    theme="dark"
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
