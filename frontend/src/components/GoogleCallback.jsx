import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { handleGoogleSignIn } from "@/utils/googleAuth";
import { showToast } from "@/utils/toast";

export default function GoogleCallback() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Handle the callback
    const handleCallback = async () => {
      try {
        setLoading(true);

        // Get the credential from URL if present
        const urlParams = new URLSearchParams(window.location.search);
        const credential = urlParams.get("credential");

        if (credential) {
          console.log("Google callback received credential, processing...");

          // Process the credential
          const result = await handleGoogleSignIn({ credential });

          if (result.success) {
            console.log("Google sign-in successful:", result);
            setSuccess(true);

            // Force update authentication state
            window.dispatchEvent(new Event("storage"));

            // Set flag for just logged in
            localStorage.setItem("justLoggedIn", "true");

            // Show success message
            showToast("Google sign-in successful!", "success");

            // Check if auth data is properly set
            const token = localStorage.getItem("token");
            const user = localStorage.getItem("user");

            if (!token || !user) {
              console.error("Auth data not properly set after Google signin");
              setError(
                "Authentication data could not be saved. Please try again."
              );
              return;
            }

            // Add a slight delay to ensure auth state is updated
            setTimeout(() => {
              console.log("Redirecting to dashboard after Google auth");
              navigate("/dashboard", { replace: true });
            }, 500);
          } else {
            console.error("Google sign-in failed:", result.message);
            setError(result.message || "Google sign-in failed");
            // Wait a bit before redirecting on error
            setTimeout(() => {
              navigate("/login", {
                state: { error: result.message || "Google sign-in failed" },
              });
            }, 2000);
          }
        } else {
          console.error("No credential found in URL");
          setError("No authentication credentials found");
          // Wait a bit before redirecting on error
          setTimeout(() => {
            navigate("/login");
          }, 2000);
        }
      } catch (error) {
        console.error("Google callback error:", error);
        setError(error.message || "Failed to process Google sign-in");
        // Wait a bit before redirecting on error
        setTimeout(() => {
          navigate("/login", {
            state: {
              error: error.message || "Failed to process Google sign-in",
            },
          });
        }, 2000);
      } finally {
        setLoading(false);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-[#23486A] to-[#1A3A5F] text-white p-4">
      <div className="bg-white rounded-xl p-8 shadow-2xl max-w-md w-full text-center border-2 border-[#FFCF50]">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-[#23486A] mb-2">
            {success
              ? "Sign In Successful!"
              : error
              ? "Sign In Failed"
              : "Processing Sign In"}
          </h2>
        </div>

        {loading && (
          <div className="flex justify-center items-center gap-2 mb-4">
            <div className="w-3 h-3 bg-[#FFCF50] rounded-full animate-bounce" />
            <div className="w-3 h-3 bg-[#FFCF50] rounded-full animate-bounce [animation-delay:-.3s]" />
            <div className="w-3 h-3 bg-[#FFCF50] rounded-full animate-bounce [animation-delay:-.5s]" />
          </div>
        )}

        {error && <div className="mb-4 text-red-500">{error}</div>}

        <p className="text-[#23486A]">
          {success
            ? "You've been signed in. Redirecting to your dashboard..."
            : loading
            ? "Processing your sign-in... Please wait."
            : error
            ? "Redirecting to login page..."
            : "Completing authentication..."}
        </p>
      </div>
    </div>
  );
}
