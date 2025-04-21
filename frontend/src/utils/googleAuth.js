import axiosInstance from "@/config/axios";
import { showToast } from "./toast.jsx";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const APP_URL = import.meta.env.VITE_APP_URL;

// Load the Google API client library
export const loadGoogleScript = () => {
  return new Promise((resolve, reject) => {
    // Check if script is already loaded
    if (
      document.querySelector(
        'script[src="https://accounts.google.com/gsi/client"]'
      )
    ) {
      if (window.google) {
        resolve(window.google);
      } else {
        // Script exists but not loaded yet, wait for it
        window.onGoogleLibraryLoad = () => resolve(window.google);
      }
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;

    // Add onload handler before adding script to document
    script.onload = () => {
      if (window.google) {
        resolve(window.google);
      } else {
        window.onGoogleLibraryLoad = () => resolve(window.google);
      }
    };

    script.onerror = (error) => {
      console.error("Google Sign-In script failed to load:", error);
      reject(
        new Error(
          "Failed to load Google Sign-In. Please check your internet connection."
        )
      );
    };

    document.body.appendChild(script);
  });
};

// Handle Google sign-in response
export const handleGoogleSignIn = async (response) => {
  try {
    // Check if we have a credential
    if (!response || !response.credential) {
      console.error("Invalid Google response:", response);
      throw new Error("No valid credential received from Google");
    }

    const credential = response.credential;

    console.log(
      "Google credential received:",
      credential.substring(0, 20) + "..."
    );

    // Decode the JWT to get user info
    const payload = parseJwt(credential);
    console.log("Decoded Google payload:", payload);

    // Extract the profile information
    const profileObj = {
      email: payload.email,
      name: payload.name,
      googleId: payload.sub,
      picture: payload.picture,
    };

    // Send both the token and profile object to the backend
    const apiResponse = await axiosInstance.post("/api/auth/google-auth", {
      token: credential,
      profileObj,
    });

    console.log("Google auth response:", apiResponse.data);

    if (apiResponse.data.success) {
      // Check if this is a login (token provided) or signup (userId provided for OTP verification)
      if (apiResponse.data.data.token) {
        // This is a login - user already exists
        const { token, user } = apiResponse.data.data;

        // Store auth data
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("lastActivity", Date.now().toString());

        // Set flag for just logged in
        localStorage.setItem("justLoggedIn", "true");

        // Return success with login flag
        return {
          success: true,
          isLogin: true,
          user,
          token,
        };
      } else if (apiResponse.data.data.userId) {
        // This is a signup - OTP verification required
        return {
          success: true,
          isLogin: false,
          requiresOTP: true,
          userId: apiResponse.data.data.userId,
          email: apiResponse.data.data.email,
          message: apiResponse.data.message,
        };
      }
    }

    return {
      success: false,
      message: apiResponse.data.message,
    };
  } catch (error) {
    console.error("Google Sign-In Error:", error);

    // Check if we need to verify email
    if (error.response?.data?.requiresOTP) {
      return {
        success: false,
        requiresOTP: true,
        userId: error.response.data.userId,
        message: error.response.data.message,
      };
    }

    throw new Error(
      error.response?.data?.message || "Google authentication failed"
    );
  }
};

// Helper function to parse JWT
function parseJwt(token) {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split("")
      .map(function (c) {
        return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
      })
      .join("")
  );

  return JSON.parse(jsonPayload);
}

export const initializeGoogleAuth = async (navigate) => {
  try {
    // Wait for the Google Identity Services script to load
    await new Promise((resolve) => {
      if (window.google) {
        resolve();
      } else {
        window.onGoogleLibraryLoad = resolve;
      }
    });

    // Initialize Google Sign-In
    const handleCredentialResponse = async (response) => {
      try {
        console.log("Google response received:", response);

        // Show a single unified message that covers the entire process
        showToast.info(
          "Processing Google authentication. You may receive an OTP for verification."
        );

        const result = await handleGoogleSignIn(response);

        if (result.success) {
          if (result.isLogin) {
            // User already exists, go to dashboard
            console.log("Google login successful, redirecting to dashboard");

            // Force update authentication state before navigation
            window.dispatchEvent(new Event("storage"));

            // Show success toast
            showToast.success("Google login successful!");

            // Increase delay to ensure auth state is fully updated
            setTimeout(() => {
              console.log(
                "Navigating to dashboard with token:",
                result.token.substring(0, 10) + "..."
              );
              // Add a query parameter to force proper auth state
              navigate("/dashboard?auth=true", { replace: true });
            }, 500); // Increased from 300ms to 500ms
          } else if (result.requiresOTP) {
            // New user, needs OTP verification
            console.log("Google signup requires OTP verification");

            navigate("/verify", {
              state: {
                userId: result.userId,
                email: result.email,
                message: result.message,
                isGoogleSignup: true,
              },
            });
          }
        } else {
          throw new Error(result.message);
        }
      } catch (error) {
        console.error("Google Sign-In Error:", error);
        // Show error toast message to user
        if (error.response && error.response.data) {
          // Extract the error message from the response
          const errorMessage =
            error.response.data.message || "Google sign-in failed";
          showToast.error(errorMessage);
        } else if (error.message) {
          // Use the error message from the error object
          showToast.error(error.message);
        } else {
          // Generic fallback message
          showToast.error("Google sign-in failed. Please try again.");
        }
      }
    };

    // Initialize Google Sign-In button
    window.google.accounts.id.initialize({
      client_id:
        import.meta.env.VITE_GOOGLE_CLIENT_ID ||
        "754912337230-06ao57p5f2ksi4g8bqjpisbtro30128h.apps.googleusercontent.com",
      callback: handleCredentialResponse,
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    // Render the button
    window.google.accounts.id.renderButton(
      document.getElementById("google-signin-button"),
      {
        theme: "outline",
        size: "large",
        width: 280,
        text: "continue_with",
        logo_alignment: "center",
      }
    );

    // Also display the One Tap UI
    window.google.accounts.id.prompt();
  } catch (error) {
    console.error("Google Auth Initialization Error:", error);
  }
};
