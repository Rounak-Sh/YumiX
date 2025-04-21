import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { yumixLogo } from "../../assets/assets.jsx";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import axios from "@/config/axios";
import useNetworkStatus from "@/hooks/useNetworkStatus";
import { showToast } from "@/utils/toast";
import { validatePassword, validateConfirmPassword } from "@/utils/validation";

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isOnline } = useNetworkStatus();
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState({
    new: false,
    confirm: false,
  });
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState(null);

  // Get user info from navigation state
  const userId = location.state?.userId;
  const isVerified = location.state?.isVerified;

  // Simplified redirect check
  useEffect(() => {
    if (!location.state) {
      navigate("/login", {
        state: { message: "Please complete the password reset process first" },
        replace: true,
      });
    }
  }, [location.state, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const togglePasswordVisibility = (field) => {
    setShowPassword((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isOnline) {
      showToast(
        "You are offline. Please check your internet connection.",
        "error"
      );
      return;
    }

    // Use validation functions from validation.js
    const passwordError = validatePassword(formData.newPassword);
    if (passwordError) {
      showToast(passwordError, "error");
      return;
    }

    const confirmPasswordError = validateConfirmPassword(
      formData.newPassword,
      formData.confirmPassword
    );
    if (confirmPasswordError) {
      showToast(confirmPasswordError, "error");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post("/api/auth/reset-password", {
        userId: location.state?.userId,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword,
      });

      if (response.data.success) {
        showToast("Password reset successful!", "success");
        setShowSuccess(true);
        setVisible(true);

        setTimeout(() => {
          setVisible(false);
          navigate("/login", {
            replace: true,
            state: {
              message:
                "Password reset successfully. Please login with your new password.",
            },
          });
        }, 2000);
      }
    } catch (error) {
      console.error("Reset password error:", error);
      showToast(
        error.response?.data?.message || "Failed to reset password",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      {/* Success Banner */}
      <div
        className={`fixed top-0 left-0 right-0 flex justify-center transition-all duration-500 ease-out 
                    ${
                      showSuccess
                        ? "translate-y-0 opacity-100"
                        : "-translate-y-full opacity-0"
                    } 
                    ${visible ? "" : "pointer-events-none"}`}>
        <div
          className="flex items-center gap-3 bg-[#4ade80] text-white px-8 py-6 rounded-b-lg 
                     shadow-[4px_4px_0px_0px_rgba(50,50,50,1)] border-2 border-t-0 border-[#323232]">
          <CheckCircleIcon className="w-7 h-7 text-white" />
          <div className="flex flex-col">
            <span className="text-xl font-bold">
              Password Reset Successfully!
            </span>
            <span className="text-base">Redirecting to login page...</span>
          </div>
        </div>
      </div>

      <div className="flex w-full max-w-4xl rounded-lg border-2 border-[#323232] shadow-[4px_4px_0px_0px_rgba(50,50,50,1)] overflow-hidden">
        {/* Logo Section */}
        <div className="hidden md:flex w-1/2 items-center justify-center p-4 bg-[#23486A]">
          <img
            src={yumixLogo}
            alt="YumiX Logo"
            className="max-w-full h-auto max-h-[400px] object-contain transform scale-105"
          />
        </div>

        {/* Form Section */}
        <div className="w-full md:w-1/2 bg-gray-200">
          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
            <div className="mb-6">
              <h2 className="text-[#323232] text-2xl font-black">
                Reset Password
              </h2>
              <span className="text-[#666] text-lg font-semibold block mb-2">
                Create your new password
              </span>
              <span className="text-sm text-[#666]">
                Please enter and confirm your new password
              </span>
            </div>

            {/* Password Fields */}
            <div className="relative">
              <input
                type={showPassword.new ? "text" : "password"}
                name="newPassword"
                placeholder="New Password"
                className="h-10 px-3 w-[400px] rounded-md border-2 border-[#323232] shadow-[4px_4px_0px_0px_rgba(50,50,50,1)] 
                         bg-white text-[#323232] font-semibold outline-none
                         focus:border-[#2d8cf0]"
                value={formData.newPassword}
                onChange={handleChange}
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility("new")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                {showPassword.new ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            </div>

            <div className="relative">
              <input
                type={showPassword.confirm ? "text" : "password"}
                name="confirmPassword"
                placeholder="Confirm New Password"
                className="h-10 px-3 w-[400px] rounded-md border-2 border-[#323232] shadow-[4px_4px_0px_0px_rgba(50,50,50,1)] 
                         bg-white text-[#323232] font-semibold outline-none
                         focus:border-[#2d8cf0]"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility("confirm")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                {showPassword.confirm ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            </div>

            {/* Reset Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-44 h-10 mt-4 mx-auto rounded-md border-2 border-[#323232] bg-white shadow-[4px_4px_0px_0px_rgba(50,50,50,1)]
                         text-[#323232] font-semibold text-lg
                         active:shadow-none active:translate-x-[3px] active:translate-y-[3px]
                         disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? (
                <div className="flex justify-center items-center gap-1">
                  <div className="w-2 h-2 bg-[#323232] rounded-full animate-[bounce_0.7s_infinite]" />
                  <div className="w-2 h-2 bg-[#323232] rounded-full animate-[bounce_0.7s_0.1s_infinite]" />
                  <div className="w-2 h-2 bg-[#323232] rounded-full animate-[bounce_0.7s_0.2s_infinite]" />
                </div>
              ) : (
                "Reset Password →"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
