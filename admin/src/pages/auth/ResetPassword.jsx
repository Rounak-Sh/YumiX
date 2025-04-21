import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { yumixLogo } from "@/assets/assets";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import adminApi from "@/services/api";
import useNetworkStatus from "@/hooks/useNetworkStatus";
import { showToast } from "@/utils/toast";
import {
  validatePassword,
  validateConfirmPassword,
  errorMessages,
  getErrorMessage,
} from "@/utils/validation";

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

  const email = location.state?.email;

  if (!email) {
    navigate("/login", { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isOnline) {
      showToast.error(
        "You are offline. Please check your internet connection."
      );
      return;
    }

    const passwordError = validatePassword(formData.newPassword);
    if (passwordError) {
      showToast.error(passwordError);
      return;
    }

    const confirmError = validateConfirmPassword(
      formData.newPassword,
      formData.confirmPassword
    );
    if (confirmError) {
      showToast.error(confirmError);
      return;
    }

    setLoading(true);

    try {
      const response = await adminApi.resetPassword({
        email,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword,
      });

      if (response.data.success) {
        showToast.success("Password reset successful!");
        setShowSuccess(true);
        setVisible(true);

        setTimeout(() => {
          setVisible(false);
          navigate("/login", { replace: true });
        }, 2000);
      }
    } catch (error) {
      showToast.error(
        error.response?.data?.message ||
          "Failed to reset password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1E1E1E] px-4">
      <div className="w-full max-w-md bg-[#252525] rounded-lg shadow-lg border border-[#333333] p-8">
        <div className="space-y-6">
          <div>
            <h2 className="text-[#E0E0E0] text-xl font-medium">
              Reset Password
            </h2>
            <p className="text-[#666666] mt-1">Enter your new password</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type={showPassword.new ? "text" : "password"}
                placeholder="New Password"
                className="w-full bg-[#2A2A2A] text-[#E0E0E0] px-4 h-11 rounded-md border border-[#333333]
                         focus:outline-none focus:border-[#4A4A4A] transition-colors
                         placeholder-[#666666]"
                value={formData.newPassword}
                onChange={(e) =>
                  setFormData({ ...formData, newPassword: e.target.value })
                }
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() =>
                  setShowPassword({ ...showPassword, new: !showPassword.new })
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666666] hover:text-[#E0E0E0]">
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
                placeholder="Confirm Password"
                className="w-full bg-[#2A2A2A] text-[#E0E0E0] px-4 h-11 rounded-md border border-[#333333]
                         focus:outline-none focus:border-[#4A4A4A] transition-colors
                         placeholder-[#666666]"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() =>
                  setShowPassword({
                    ...showPassword,
                    confirm: !showPassword.confirm,
                  })
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666666] hover:text-[#E0E0E0]">
                {showPassword.confirm ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            </div>

            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-sm font-medium text-[#2d8cf0] hover:underline">
                Back to Login
              </button>
            </div>

            <div className="flex justify-center mt-6">
              <button
                type="submit"
                disabled={loading || !isOnline}
                className="w-2/3 bg-[#252525] text-[#E0E0E0] font-bold uppercase
                         border border-[#333333] rounded-md
                         flex items-center justify-center px-4 py-4 transition-all duration-420
                         before:content-[''] before:bg-white before:h-[1px] 
                         before:w-0 before:mr-2 before:transition-all before:duration-420
                         hover:before:w-12 hover:text-white 
                         disabled:opacity-50 disabled:cursor-not-allowed 
                         disabled:hover:border-[#333333]
                         disabled:hover:text-[#E0E0E0] disabled:hover:before:w-0">
                {loading ? (
                  <div className="flex justify-center items-center gap-1">
                    <div className="w-2 h-2 bg-[#bdb4b4] rounded-full animate-[bounce_0.7s_infinite]"></div>
                    <div className="w-2 h-2 bg-[#bdb4b4] rounded-full animate-[bounce_0.7s_0.1s_infinite]"></div>
                    <div className="w-2 h-2 bg-[#bdb4b4] rounded-full animate-[bounce_0.7s_0.2s_infinite]"></div>
                  </div>
                ) : (
                  <>Reset Password</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
