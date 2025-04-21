import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import axios from "@/config/axios";
import { yumixLogo, googleIcon } from "../../assets/assets.jsx";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/solid";
import { validateRegistrationForm } from "@/utils/validation";
import useNetworkStatus from "@/hooks/useNetworkStatus";
import { initializeGoogleAuth } from "@/utils/googleAuth";
import { showToast } from "@/utils/toast";
import GuestSupportModal from "@/components/GuestSupportModal";
import { QuestionMarkCircleIcon } from "@heroicons/react/24/outline";

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isOnline } = useNetworkStatus();

  // Define formData state first
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState({
    password: false,
    confirmPassword: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSupportModal, setShowSupportModal] = useState(false);

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Use validation function from utils
    const errors = validateRegistrationForm(formData);
    if (Object.keys(errors).length > 0) {
      showToast.error(Object.values(errors)[0]);
      return;
    }

    if (!isOnline) {
      showToast.error(
        "You are offline. Please check your internet connection."
      );
      return;
    }

    setLoading(true);

    try {
      // Format phone number if needed
      let phone = formData.phone;
      if (!phone.startsWith("+91")) {
        phone = phone.replace(/\D/g, "");
        if (phone.startsWith("91")) {
          phone = phone.substring(2);
        }
        phone = `+91${phone}`;
      }

      const response = await axios.post("/auth/register", {
        name: formData.name,
        email: formData.email,
        phone,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });

      if (response.data.success) {
        showToast.success(
          "Registration successful! Please verify your account."
        );

        // Navigate to verify page with userId
        navigate("/verify", {
          state: {
            userId: response.data.data.userId,
            message: response.data.message,
          },
          replace: true,
        });
      }
    } catch (error) {
      console.error("Registration error:", error);
      showToast.error(
        error.response?.data?.message ||
          "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPassword((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4">
      <div className="flex w-full max-w-4xl h-[640px] rounded-lg border-2 border-[#323232] shadow-[4px_4px_0px_0px_rgba(50,50,50,1)] overflow-hidden">
        {/* Logo Section */}
        <div className="hidden md:flex w-1/2 items-center justify-center p-4 bg-[#23486A]">
          <img
            src={yumixLogo}
            alt="YumiX Logo"
            className="max-w-full h-auto max-h-[350px] object-contain transform scale-105"
          />
        </div>

        {/* Form Section */}
        <div
          className="w-full md:w-1/2 bg-gray-200 
            overflow-auto 
            custom-scrollbar">
          <form
            onSubmit={handleSubmit}
            className="p-6 flex flex-col gap-3"
            noValidate>
            <div className="mb-2">
              <h2 className="text-[#323232] text-2xl font-black">Welcome,</h2>
              <span className="text-[#666] text-lg font-semibold">
                sign up to continue
              </span>
            </div>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

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

            {/* Registration Fields */}
            <div className="space-y-3">
              <input
                type="text"
                name="name"
                placeholder="Full Name"
                className="h-10 px-3 w-[400px] rounded-md border-2 border-[#323232] shadow-[4px_4px_0px_0px_rgba(50,50,50,1)] 
                       bg-white text-[#323232] font-semibold outline-none
                       focus:border-[#2d8cf0]"
                value={formData.name}
                onChange={handleChange}
              />

              <input
                type="email"
                name="email"
                placeholder="Email Address"
                className="h-10 px-3 w-[400px] rounded-md border-2 border-[#323232] shadow-[4px_4px_0px_0px_rgba(50,50,50,1)] 
                       bg-white text-[#323232] font-semibold outline-none
                       focus:border-[#2d8cf0]"
                value={formData.email}
                onChange={handleChange}
              />

              <input
                type="tel"
                name="phone"
                placeholder="Phone Number"
                className="h-10 px-3 w-[400px] rounded-md border-2 border-[#323232] shadow-[4px_4px_0px_0px_rgba(50,50,50,1)] 
                       bg-white text-[#323232] font-semibold outline-none
                       focus:border-[#2d8cf0]"
                value={formData.phone}
                onChange={handleChange}
              />

              <div className="relative">
                <input
                  type={showPassword.password ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  className="h-10 px-3 w-[400px] rounded-md border-2 border-[#323232] shadow-[4px_4px_0px_0px_rgba(50,50,50,1)] 
                         bg-white text-[#323232] font-semibold outline-none
                         focus:border-[#2d8cf0]"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility("password")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                  {showPassword.password ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>

              <div className="relative">
                <input
                  type={showPassword.confirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  className="h-10 px-3 w-[400px] rounded-md border-2 border-[#323232] shadow-[4px_4px_0px_0px_rgba(50,50,50,1)] 
                         bg-white text-[#323232] font-semibold outline-none
                         focus:border-[#2d8cf0]"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility("confirmPassword")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                  {showPassword.confirmPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !isOnline}
              className="w-32 h-10 mt-4 mx-auto rounded-md border-2 border-[#323232] bg-white shadow-[4px_4px_0px_0px_rgba(50,50,50,1)]
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
                "Let's go →"
              )}
            </button>

            {/* Login Link */}
            <p className="text-center text-[#666] mt-2">
              Already have an account?{" "}
              <span className="text-[#2d8cf0] hover:underline font-semibold">
                <Link to="/login">Sign in</Link>
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
