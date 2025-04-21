import { useState } from "react";
import { useNavigate } from "react-router-dom";
import adminApi from "@/services/api";
import useNetworkStatus from "@/hooks/useNetworkStatus";
import { yumixLogo } from "@/assets/assets";
import { showToast } from "@/utils/toast";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { isOnline } = useNetworkStatus();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      showToast.warning("Please enter your email");
      return;
    }

    try {
      setLoading(true);
      if (!isOnline) {
        setError("You are offline. Please check your internet connection.");
        return;
      }

      if (loading) {
        return;
      }

      setError("");

      const response = await adminApi.forgotPassword(email);

      if (response?.data?.success) {
        setSubmitted(true);
        showToast.success(
          "Reset password link has been sent to your email address"
        );
        navigate("/verify-otp", {
          state: {
            email,
            isForgotPassword: true,
          },
          replace: true,
        });
      } else {
        setError("Failed to send OTP. Please try again.");
      }
    } catch (error) {
      setLoading(false);

      if (error.response && error.response.status === 404) {
        showToast.error("Email not found");
      } else if (error.response && error.response.status === 429) {
        showToast.error(
          "Too many requests. Please try again after a few minutes."
        );
      } else {
        showToast.error("Error sending reset link. Please try again later.");
      }
    }
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    setError("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1E1E1E] px-4">
      <div className="w-full max-w-4xl flex rounded-lg shadow-lg border border-[#333333]">
        {/* Logo Section */}
        <div className="hidden md:flex w-1/2 bg-[#252525] border-r border-[#333333] p-12 items-center justify-center">
          <div className="text-center">
            <img
              src={yumixLogo}
              alt="YumiX Admin"
              className="w-64 h-64 object-contain opacity-90"
            />
            <h1 className="text-[#E0E0E0] text-2xl font-medium">
              Reset Password
            </h1>
          </div>
        </div>

        {/* Form Section */}
        <div className="w-full md:w-1/2 bg-[#252525] p-12">
          <div className="space-y-6">
            <div>
              <h2 className="text-[#E0E0E0] text-xl font-medium">
                Forgot Password?
              </h2>
              <p className="text-[#666666] mt-1">
                Enter your email to receive a password reset OTP
              </p>
            </div>

            {error && (
              <div className="bg-[#2A2020] border-l-2 border-[#FF4444] text-[#FF4444] px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                className="w-full bg-[#2A2A2A] text-[#E0E0E0] px-4 h-11 rounded-md border border-[#333333]
                         focus:outline-none focus:border-[#4A4A4A] transition-colors
                         placeholder-[#666666]"
                value={email}
                onChange={handleEmailChange}
                disabled={loading}
                autoComplete="email"
                required
              />

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="text-[#666666] hover:text-[#E0E0E0]">
                  Back to Login
                </button>
                <button
                  type="submit"
                  disabled={loading || !email.trim() || !isOnline}
                  className="px-6 h-10 rounded-md bg-[#2d8cf0] text-white font-medium
                           hover:bg-[#2d8cf0]/90 transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? "Sending..." : "Send OTP"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
