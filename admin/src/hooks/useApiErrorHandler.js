import { useEffect } from "react";
import { showToast } from "@/utils/toast";

const useApiErrorHandler = (error, defaultMessage = "An error occurred") => {
  useEffect(() => {
    if (!error) return;

    // Check if this is a demo restriction error
    const isDemoRestriction =
      error.response?.data?.isDemoRestriction ||
      error.response?.data?.message?.includes("demo mode");

    if (isDemoRestriction) {
      showToast.info(
        "This action is not available in demo mode. You have read-only access."
      );
      return;
    }

    // Handle other error types
    const errorMessage = error.response?.data?.message || defaultMessage;
    showToast.error(errorMessage);
  }, [error, defaultMessage]);
};

export default useApiErrorHandler;
