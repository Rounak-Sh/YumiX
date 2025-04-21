import { useState, useEffect } from "react";
import { CheckCircleIcon, XMarkIcon } from "@heroicons/react/24/solid";
import adminApi from "@/services/api";
import { showToast } from "@/utils/toast";

const ProfileOtpVerification = ({
  isOpen,
  onClose,
  onSuccess,
  updateType,
  updateData,
}) => {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timer, setTimer] = useState(30);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    // Reset OTP when modal opens
    if (isOpen) {
      setOtp(["", "", "", "", "", ""]);
      setLoading(false);
      setShowSuccess(false);
      // Request OTP when opened
      handleRequestOTP();
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

      // Get new email from updateData if type is email
      const newEmail = updateType === "email" ? updateData.email : null;

      const response = await adminApi.requestProfileUpdateOTP(
        updateType,
        newEmail
      );

      if (response.data.success) {
        showToast.success(
          response.data.message || "Verification code sent successfully"
        );
        setTimer(30);
      } else {
        showToast.error(
          response.data.message || "Failed to send verification code"
        );
      }
    } catch (error) {
      showToast.error(
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
      showToast.error("Please enter all digits");
      return;
    }

    setLoading(true);

    try {
      // Prepare data based on update type
      const payload = {
        type: updateType,
        otp: otpString,
        ...updateData,
      };

      const response = await adminApi.updateProfileWithOTP(payload);

      if (response.data.success) {
        setShowSuccess(true);
        showToast.success(response.data.message || "Update successful");

        // Wait a bit to show success state
        setTimeout(() => {
          onSuccess(response.data.data);
          onClose();
        }, 1500);
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        "Verification failed. Please try again.";
      showToast.error(errorMessage);

      // Handle specific error types
      const errorType = error.response?.data?.errorType;
      if (errorType === "expired_otp") {
        showToast.error(
          "Verification code has expired. Please request a new one."
        );
      } else if (errorType === "incorrect_password") {
        showToast.error("Current password is incorrect.");
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

        <div className="w-full max-w-md transform rounded-lg bg-[#252525] p-6 text-left align-bottom shadow-xl transition-all">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-[#E0E0E0]">
              {showSuccess
                ? "Verification Successful"
                : "Verification Required"}
            </h3>
            <button
              onClick={onClose}
              className="rounded-full p-1 text-[#666666] hover:text-[#E0E0E0] focus:outline-none">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {showSuccess ? (
            <div className="text-center py-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
              </div>
              <p className="mt-3 text-[#E0E0E0]">
                {updateType === "email"
                  ? "Email updated successfully"
                  : "Password updated successfully"}
              </p>
            </div>
          ) : (
            <>
              <p className="text-[#999999] mb-4">
                {updateType === "email"
                  ? `To change your email to ${updateData.email}, please verify with the code sent to your new email address.`
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
                      className="w-11 h-11 text-center bg-[#2A2A2A] text-[#E0E0E0] rounded-md 
                               border border-[#333333] text-xl font-semibold
                               focus:outline-none focus:border-[#4A4A4A] transition-colors
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
                    className="text-sm font-medium text-[#2d8cf0] hover:underline disabled:text-[#666666] disabled:cursor-not-allowed disabled:no-underline">
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
                    className="w-full bg-[#2d8cf0] text-white py-2 px-4 rounded-md font-medium hover:bg-[#2b7fd6] focus:outline-none focus:ring-2 focus:ring-[#2d8cf0] focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed">
                    {loading ? (
                      <div className="flex justify-center items-center gap-1">
                        <div className="w-2 h-2 bg-white rounded-full animate-[bounce_0.7s_infinite]"></div>
                        <div className="w-2 h-2 bg-white rounded-full animate-[bounce_0.7s_0.1s_infinite]"></div>
                        <div className="w-2 h-2 bg-white rounded-full animate-[bounce_0.7s_0.2s_infinite]"></div>
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
