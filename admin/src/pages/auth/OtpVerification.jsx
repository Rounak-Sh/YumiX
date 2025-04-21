import { useState, useEffect } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { yumixLogo } from "@/assets/assets";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import adminApi from "@/services/api";
import useNetworkStatus from "@/hooks/useNetworkStatus";
import { showToast } from "@/utils/toast";
import {
  validateOtpForm,
  errorMessages,
  getErrorMessage,
} from "@/utils/validation";

export default function OtpVerification() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isOnline } = useNetworkStatus();
  const email = location.state?.email;
  const isForgotPassword = location.state?.isForgotPassword;

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timer, setTimer] = useState(30);
  const [showSuccess, setShowSuccess] = useState(false);
  const [visible, setVisible] = useState(false);

  // If no email in state, redirect to login
  if (!location.state?.email) {
    return <Navigate to="/login" replace />;
  }

  useEffect(() => {
    // Check if user is already authenticated or missing email
    const token = localStorage.getItem("adminToken");
    if (token && !isForgotPassword) {
      navigate("/dashboard", { replace: true });
      return;
    }

    if (!email) {
      navigate("/login", { replace: true });
      return;
    }
  }, [email, navigate, isForgotPassword]);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

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

    if (!isOnline) {
      showToast.error(
        "You are offline. Please check your internet connection."
      );
      return;
    }

    const otpString = otp.join("");
    if (otpString.length !== 6) {
      showToast.error("Please enter all digits");
      return;
    }

    setLoading(true);

    try {
      const response = await adminApi.verifyOtp({
        email,
        otp: otpString,
        isForgotPassword,
      });

      if (response.data.success) {
        showToast.success("OTP verified successfully!");

        if (isForgotPassword) {
          navigate("/reset-password", {
            state: { email },
            replace: true,
          });
        } else {
          if (response.data.token) {
            localStorage.setItem("adminToken", response.data.token);
          }
          setShowSuccess(true);
          setVisible(true);

          setTimeout(() => {
            setVisible(false);
            navigate("/dashboard", { replace: true });
          }, 2000);
        }
      }
    } catch (error) {
      showToast.error(
        error.response?.data?.message ||
          "Failed to verify OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!isOnline) {
      showToast.error(
        "You are offline. Please check your internet connection."
      );
      return;
    }

    setResendLoading(true);

    try {
      const response = await adminApi.resendOtp({
        email,
        isForgotPassword: !!isForgotPassword,
      });

      if (response.data.success) {
        showToast.success("OTP resent successfully!");
        setTimer(30);
      }
    } catch (error) {
      showToast.error(
        error.response?.data?.message ||
          "Failed to resend OTP. Please try again."
      );
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1E1E1E] px-4">
      <div className="w-full max-w-md bg-[#252525] rounded-lg shadow-lg border border-[#333333] p-8">
        <div className="space-y-6">
          <div>
            <h2 className="text-[#E0E0E0] text-xl font-medium">
              OTP Verification
            </h2>
            <p className="text-[#666666] mt-1">Enter the OTP sent to {email}</p>
          </div>

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
                  className="w-12 h-12 text-center bg-[#2A2A2A] text-[#E0E0E0] rounded-md 
                           border border-[#333333] text-xl font-semibold
                           focus:outline-none focus:border-[#4A4A4A] transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed
                           placeholder-[#666666]"
                  disabled={loading}
                  inputMode="numeric"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  required
                />
              ))}
            </div>

            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-sm font-medium text-[#2d8cf0] hover:underline">
                Back to Login
              </button>

              {timer > 0 ? (
                <span className="text-sm text-[#666666]">
                  Resend in {timer}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="text-sm font-medium text-[#2d8cf0] hover:underline
                           disabled:text-[#666666] disabled:no-underline disabled:cursor-not-allowed">
                  {resendLoading ? (
                    <div className="flex justify-center items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-[#2d8cf0] rounded-full animate-[bounce_0.7s_infinite]"></div>
                      <div className="w-1.5 h-1.5 bg-[#2d8cf0] rounded-full animate-[bounce_0.7s_0.1s_infinite]"></div>
                      <div className="w-1.5 h-1.5 bg-[#2d8cf0] rounded-full animate-[bounce_0.7s_0.2s_infinite]"></div>
                    </div>
                  ) : (
                    "Resend OTP"
                  )}
                </button>
              )}
            </div>

            <div className="flex justify-center mt-6">
              <button
                type="submit"
                disabled={
                  loading || !isOnline || otp.some((d) => d.length !== 1)
                }
                className="w-44 bg-[#252525] text-[#E0E0E0] font-bold uppercase
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
                  <>Verify</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
