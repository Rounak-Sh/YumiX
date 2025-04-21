import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import axios from "@/config/axios";
import { yumixLogo, googleIcon } from "../../assets/assets.jsx";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/solid";
import { validateLoginForm } from "@/utils/validation";
import useNetworkStatus from "@/hooks/useNetworkStatus";
import { initializeGoogleAuth, handleGoogleSignIn } from "@/utils/googleAuth";
import { showToast } from "@/utils/toast";
import GuestSupportModal from "@/components/GuestSupportModal";
import { QuestionMarkCircleIcon } from "@heroicons/react/24/outline";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isOnline } = useNetworkStatus();

  const [formData, setFormData] = useState({
    emailOrPhone: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(location.state?.message || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState({});
  const [isLocked, setIsLocked] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  // Get return URL from query params
  const searchParams = new URLSearchParams(window.location.search);
  const returnUrl = searchParams.get("returnUrl");

  useEffect(() => {
    // Clear success message after 5 seconds
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // Show success message from registration/verification if exists
  useEffect(() => {
    if (location.state?.message) {
      setError(location.state.message);
      // Clear the message from location state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Initialize Google Auth
  useEffect(() => {
    if (!isOnline) return;

    const initGoogle = async () => {
      try {
        await initializeGoogleAuth(navigate);
      } catch (error) {
        console.error("Google Auth Init Error:", error);
        setError("Failed to initialize Google Sign-In");
      }
    };

    initGoogle();
  }, [isOnline, navigate]);

  useEffect(() => {
    // Check for admin auth errors
    const authError = localStorage.getItem("adminAuthError");
    if (authError) {
      setError(authError);
      localStorage.removeItem("adminAuthError");
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Use our validation function
    const validationError = validateLoginForm(formData);
    if (validationError) {
      showToast.error(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Format phone number if it's a phone number
      let emailOrPhone = formData.emailOrPhone;
      if (!emailOrPhone.includes("@")) {
        emailOrPhone = emailOrPhone.replace(/\D/g, "");
        if (emailOrPhone.startsWith("91")) {
          emailOrPhone = emailOrPhone.substring(2);
        }
        emailOrPhone = `+91${emailOrPhone}`;
      }

      // Try login
      const loginDetails = {
        emailOrPhone,
        password: formData.password,
      };

      const response = await axios.post("/auth/login", loginDetails);

      if (response.data.success) {
        // Extract from nested data property correctly
        const { token, user } = response.data.data || {};

        // Check if token and user exist before storing
        if (token && user) {
          // Store auth data
          localStorage.setItem("user", JSON.stringify(user));
          localStorage.setItem("token", token);
          localStorage.setItem("lastActivity", Date.now().toString());

          // Set flag for just logged in
          localStorage.setItem("justLoggedIn", "true");

          // Force update authentication state
          window.dispatchEvent(new Event("storage")); // Trigger storage event to sync auth state

          // Show success message before navigation
          showToast.success("Login successful!");

          // Navigate to appropriate page
          setTimeout(() => {
            navigate(returnUrl || "/dashboard?auth=true", { replace: true });
          }, 500);
        } else {
          // Handle missing data
          showToast.error(
            "Login succeeded but user data is missing. Please try again."
          );
        }
      }
    } catch (error) {
      // Check if account is locked
      if (
        error.response?.status === 401 &&
        error.response?.data?.message?.includes("Account locked")
      ) {
        setIsLocked(true);
        setError(
          "Account locked due to too many failed attempts. Try again later or click 'Unlock Account'."
        );
      }
      // Check if user has been blocked by an administrator
      else if (
        error.response?.status === 403 &&
        error.response?.data?.message?.includes("blocked")
      ) {
        setError(
          "Your account has been blocked by an administrator. Please contact support for assistance."
        );
        showToast.error(
          "Account blocked: You cannot access your account at this time. Please contact support."
        );
      } else if (error.response?.status === 401) {
        // For 401 Unauthorized errors (invalid credentials)
        setError(
          "Invalid email/phone or password. Please check your credentials and try again."
        );

        // Show a more helpful message about password reset
        showToast.error(
          "Login failed. Try resetting your password if you're having trouble."
        );

        showToast.info(
          "If you're having trouble logging in, please use the 'Forgot password' option to reset your password."
        );
      } else {
        // For other errors
        const errorMessage =
          error.response?.data?.message || "Login failed. Please try again.";
        setError(errorMessage);
        showToast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.emailOrPhone) {
      showToast.error("Please enter your email or phone number first");
      return;
    }

    setForgotPasswordLoading(true);
    try {
      const isEmail = formData.emailOrPhone.includes("@");
      let emailOrPhone = formData.emailOrPhone;

      if (!isEmail) {
        emailOrPhone = emailOrPhone.replace(/[^\d]/g, "");
        if (emailOrPhone.startsWith("91")) {
          emailOrPhone = emailOrPhone.substring(2);
        }
        emailOrPhone = `+91${emailOrPhone}`;
      }

      console.log("Sending forgot password request with:", { emailOrPhone });

      const response = await axios.post("/auth/forgot-password", {
        emailOrPhone,
      });

      console.log("Forgot password response:", response.data);

      if (response.data.success) {
        showToast.success("Password reset instructions sent!");

        // For development, store the OTP in verification data but don't show it in toast
        const verificationData = {
          contact: emailOrPhone,
          isEmail,
          type: "reset-password",
          timestamp: Date.now(),
          userId: response.data.userId,
          // Store the dev OTP if available
          otp: response.data.devOtp,
        };
        localStorage.setItem(
          "verificationData",
          JSON.stringify(verificationData)
        );

        // Navigate to verification page
        navigate("/verify", {
          state: {
            contact: emailOrPhone,
            message: response.data.message,
            isForgotPassword: true,
            type: "reset-password",
            isEmail,
            fromForgotPassword: true,
            userId: response.data.userId,
            // Pass the dev OTP if available
            devOtp: response.data.devOtp,
          },
        });
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      showToast.error(
        error.response?.data?.message ||
          "Failed to process request. Please try again."
      );
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleUnlockAccount = async () => {
    try {
      setLoading(true);

      const response = await axios.post("/auth/unlock-account", {
        emailOrPhone: formData.emailOrPhone,
      });

      if (response.data.success) {
        showToast.success(
          "Account unlocked successfully. Please try logging in again."
        );
        setIsLocked(false);
      }
    } catch (error) {
      console.error("Unlock account error:", error);
      showToast.error(
        error.response?.data?.message ||
          "Failed to unlock account. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4">
      <div className="flex w-full max-w-4xl h-[510px] rounded-lg border-2 border-[#323232] shadow-[4px_4px_0px_0px_rgba(50,50,50,1)] overflow-hidden">
        {/* Logo Section */}
        <div className="hidden md:flex w-1/2 items-center justify-center p-4 bg-[#23486A]">
          <img
            src={yumixLogo}
            alt="YumiX Logo"
            className="max-w-full h-auto max-h-[400px] object-contain transform scale-105"
          />
        </div>

        {/* Form Section */}
        <div className="w-full md:w-1/2 bg-gray-200 overflow-auto custom-scrollbar">
          <form
            onSubmit={handleSubmit}
            className="p-6 flex flex-col gap-3"
            noValidate>
            <div className="mb-3">
              <h2 className="text-[#323232] text-2xl font-black">
                Welcome back!
              </h2>
              <span className="text-[#666] text-lg font-semibold">
                sign in to continue
              </span>
            </div>

            {/* Google Sign In Container */}
            <div className="relative w-[280px] h-[40px] mx-auto group">
              <div
                id="google-signin-button"
                className="absolute inset-0 opacity-0 z-20"
              />
              <div
                className="relative flex w-full h-full items-center justify-center gap-2
                           bg-white border-2 border-[#323232] rounded-md shadow-[4px_4px_0px_0px_rgba(50,50,50,1)]
                           font-semibold text-[#323232] overflow-hidden">
                <div className="absolute inset-0 w-0 bg-[#212121] transition-all duration-300 ease-out group-hover:w-full" />
                <img
                  src={googleIcon}
                  alt="Google"
                  className="w-6 h-6 relative z-10"
                />
                <span className="relative z-10 group-hover:text-white transition-colors duration-300">
                  Continue with Google
                </span>
              </div>
            </div>

            {/* Separator */}
            <div className="flex items-center justify-center gap-2 w-full my-2">
              <div className="w-[100px] h-[3px] rounded bg-[#666]"></div>
              <span className="text-[#323232] font-semibold">OR</span>
              <div className="w-[100px] h-[3px] rounded bg-[#666]"></div>
            </div>

            {/* Login Fields */}
            <div className="relative">
              <input
                type="text"
                name="emailOrPhone"
                placeholder="Email or Phone Number"
                autoComplete="username"
                className="h-10 px-3 w-[400px] rounded-md border-2 border-[#323232] shadow-[4px_4px_0px_0px_rgba(50,50,50,1)] 
                         bg-white text-[#323232] font-semibold outline-none
                         focus:border-[#2d8cf0]"
                value={formData.emailOrPhone}
                onChange={handleChange}
              />
            </div>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                autoComplete="current-password"
                className="h-10 px-3 pr-10 w-[400px] rounded-md border-2 border-[#323232] shadow-[4px_4px_0px_0px_rgba(50,50,50,1)] 
                         bg-white text-[#323232] font-semibold outline-none
                         focus:border-[#2d8cf0]"
                value={formData.password}
                onChange={handleChange}
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
              {!forgotPasswordLoading && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="absolute right-0 -bottom-6 text-sm font-medium text-[#2d8cf0] hover:underline">
                  Forgot password?
                </button>
              )}
            </div>

            {/* Loading indicator for forgot password */}
            {forgotPasswordLoading && (
              <div className="flex justify-center items-center gap-1 mt-2">
                <div className="w-2 h-2 bg-[#2d8cf0] rounded-full animate-[bounce_0.7s_infinite]"></div>
                <div className="w-2 h-2 bg-[#2d8cf0] rounded-full animate-[bounce_0.7s_0.1s_infinite]"></div>
                <div className="w-2 h-2 bg-[#2d8cf0] rounded-full animate-[bounce_0.7s_0.2s_infinite]"></div>
              </div>
            )}

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading || !isOnline}
              className="w-48 h-10 mt-8 mx-auto rounded-md border-2 border-[#323232] bg-white shadow-[4px_4px_0px_0px_rgba(50,50,50,1)]
                        text-[#323232] font-semibold text-lg
                        active:shadow-none active:translate-x-[3px] active:translate-y-[3px]
                        disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? (
                <div className="flex justify-center items-center gap-1">
                  <div className="w-2 h-2 bg-[#323232] rounded-full animate-[bounce_0.7s_infinite]"></div>
                  <div className="w-2 h-2 bg-[#323232] rounded-full animate-[bounce_0.7s_0.1s_infinite]"></div>
                  <div className="w-2 h-2 bg-[#323232] rounded-full animate-[bounce_0.7s_0.2s_infinite]"></div>
                </div>
              ) : (
                "Sign in →"
              )}
            </button>

            {isLocked && (
              <button
                type="button"
                onClick={handleUnlockAccount}
                disabled={loading}
                className="w-full py-2 mt-2 text-white bg-yellow-500 rounded-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-50">
                {loading ? "Processing..." : "Unlock Account"}
              </button>
            )}

            {/* Login Link */}
            <p className="text-center text-[#666] mt-4">
              Don't have an account?
              <span className="text-[#2d8cf0] hover:underline font-semibold">
                <Link to="/register">Sign up</Link>
              </span>
            </p>

            {/* Support Link */}
            <div className="flex justify-center mt-2">
              <button
                type="button"
                onClick={() => setShowSupportModal(true)}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#23486A] transition-colors">
                <QuestionMarkCircleIcon className="w-4 h-4" />
                <span>Need help with your account?</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Support Modal */}
      <GuestSupportModal
        isOpen={showSupportModal}
        onClose={() => setShowSupportModal(false)}
      />
    </div>
  );
}
