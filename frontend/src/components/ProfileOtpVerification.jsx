import { useState, useEffect } from "react";
import { CheckCircleIcon, XMarkIcon } from "@heroicons/react/24/solid";
import {
  requestUpdateOTP,
  updateProfileWithOTP,
} from "../services/userService";
import { toast } from "react-toastify";

const ProfileOtpVerification = ({
  isOpen,
  onClose,
  onSuccess,
  updateType, // "email", "phone", or "password"
  updateData, // Contains the data to update, like email, phone, passwords
}) => {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timer, setTimer] = useState(30);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    // Reset OTP when modal opens
    console.log("[DEBUG] Modal isOpen changed:", isOpen);
    console.log("[DEBUG] updateType:", updateType);
    console.log("[DEBUG] updateData:", updateData);

    if (isOpen) {
      console.log(
        "[DEBUG] Modal opened - resetting OTP and preparing to request"
      );
      setOtp(["", "", "", "", "", ""]);
      setLoading(false);
      setShowSuccess(false);

      // Request OTP when opened - use setTimeout to ensure state is updated first
      setTimeout(() => {
        console.log("[DEBUG] Calling handleRequestOTP");
        handleRequestOTP();
      }, 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleRequestOTP = async () => {
    try {
      setResendLoading(true);

      // Get new email/phone from updateData if applicable
      const newValue =
        updateType === "email"
          ? updateData.email
          : updateType === "phone"
          ? updateData.phone
          : null;

      console.log("[DEBUG] Before API call - request profile OTP with:", {
        updateType,
        newValue,
        updateData,
      });

      // Send to new address for email/phone changes, current address for password
      const sendToNew = updateType !== "password";

      const response = await requestUpdateOTP(updateType, newValue, sendToNew);

      console.log("[DEBUG] OTP request response:", response);

      if (response.success) {
        const sentToMessage =
          updateType === "email" && newValue
            ? `Verification code sent to ${newValue}`
            : updateType === "phone" && newValue
            ? `Verification code sent to ${newValue}`
            : "Verification code sent to your email";

        toast.success(response.message || sentToMessage);
        setTimer(30);
      } else {
        console.error("[DEBUG] OTP request failed:", response.message);
        toast.error(response.message || "Failed to send verification code");
      }
    } catch (error) {
      console.error("[DEBUG] OTP request error:", error);
      console.error("[DEBUG] Error response:", error.response?.data);
      toast.error(
        error.response?.data?.message || "Failed to send verification code"
      );
    } finally {
      setResendLoading(false);
    }
  };

  const handleChange = (index, value) => {
    if (value.length > 1) return;
    const digit = value.replace(/\D/g, "");
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    if (digit && index < 5) {
      const nextInput = document.querySelector(
        `input[name='otp-${index + 1}']`
      );
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        const prevInput = document.querySelector(
          `input[name='otp-${index - 1}']`
        );
        if (prevInput) prevInput.focus();
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const otpString = otp.join("");
    if (otpString.length !== 6) {
      toast.error("Please enter all digits of the verification code");
      return;
    }

    setLoading(true);

    try {
      // Prepare data based on update type
      const payload = {
        type: updateType,
        otp: otpString,
      };

      // Add specific fields based on update type
      if (updateType === "email" && updateData.email) {
        payload.email = updateData.email;
      } else if (updateType === "phone" && updateData.phone) {
        payload.phone = updateData.phone;
      } else if (updateType === "password") {
        // Ensure all required password fields are included
        if (!updateData.currentPassword || !updateData.newPassword) {
          toast.error("Current and new password are required");
          setLoading(false);
          return;
        }

        payload.currentPassword = updateData.currentPassword;
        payload.newPassword = updateData.newPassword;
        payload.confirmPassword = updateData.newPassword; // Ensure confirmPassword is included
      }

      console.log("[DEBUG] Submitting OTP verification with payload:", payload);

      const response = await updateProfileWithOTP(payload);

      console.log("[DEBUG] OTP verification response:", response);

      if (response.success) {
        setShowSuccess(true);
        toast.success(response.message || "Update successful");

        // Wait a bit to show success state
        setTimeout(() => {
          onSuccess(response.data);
          onClose();
        }, 1500);
      } else {
        // Handle error from response
        toast.error(
          response.message || "Verification failed. Please try again."
        );
      }
    } catch (error) {
      console.error("[DEBUG] OTP verification error:", error);
      console.error("[DEBUG] Error response:", error.response?.data);

      const errorMessage =
        error.response?.data?.message ||
        "Verification failed. Please try again.";
      toast.error(errorMessage);

      // Handle specific error types
      const errorType = error.response?.data?.errorType;
      if (errorType === "expired_otp") {
        toast.error("Verification code has expired. Please request a new one.");
      } else if (errorType === "incorrect_password") {
        toast.error("Current password is incorrect.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        <div
          className="fixed inset-0 bg-black bg-opacity-75 transition-opacity"
          onClick={onClose}></div>

        <div className="w-full max-w-md transform rounded-lg bg-white p-6 text-left align-bottom shadow-xl transition-all">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-[#23486A]">
              {showSuccess
                ? "Verification Successful"
                : "Verification Required"}
            </h3>
            <button
              onClick={onClose}
              className="rounded-full p-1 text-gray-400 hover:text-gray-600 focus:outline-none">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {showSuccess ? (
            <div className="text-center py-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
              </div>
              <p className="mt-3 text-gray-700">
                {updateType === "email"
                  ? "Email updated successfully"
                  : updateType === "phone"
                  ? "Phone number updated successfully"
                  : "Password updated successfully"}
              </p>
            </div>
          ) : (
            <>
              <p className="text-gray-600 mb-4">
                {updateType === "email"
                  ? `To change your email to ${updateData.email}, please verify with the code sent to your new email address.`
                  : updateType === "phone"
                  ? `To change your phone number to ${updateData.phone}, please verify with the code sent to your new phone number.`
                  : "To change your password, please verify with the code sent to your email address."}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex justify-center gap-2">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      type="text"
                      name={`otp-${index}`}
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className="w-11 h-11 text-center bg-white text-[#23486A] rounded-md 
                               border border-gray-300 text-xl font-semibold
                               focus:outline-none focus:ring-2 focus:ring-[#FFCF50] transition-colors
                               disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={loading}
                      inputMode="numeric"
                      autoComplete={index === 0 ? "one-time-code" : "off"}
                      required
                    />
                  ))}
                </div>

                <div className="flex justify-between items-center mt-4">
                  <button
                    type="button"
                    onClick={handleRequestOTP}
                    disabled={timer > 0 || resendLoading}
                    className="text-sm font-medium text-[#23486A] hover:underline disabled:text-gray-400 disabled:cursor-not-allowed disabled:no-underline">
                    {resendLoading
                      ? "Sending..."
                      : timer > 0
                      ? `Resend in ${timer}s`
                      : "Resend Code"}
                  </button>
                </div>

                <div className="flex justify-center mt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#23486A] text-white py-2 px-4 rounded-md font-medium hover:bg-[#1a3652] focus:outline-none focus:ring-2 focus:ring-[#FFCF50] focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed">
                    {loading ? (
                      <div className="flex justify-center items-center gap-1">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse delay-150"></div>
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse delay-300"></div>
                      </div>
                    ) : (
                      "Verify"
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileOtpVerification;
