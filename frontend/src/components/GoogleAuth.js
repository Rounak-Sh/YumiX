const handleGoogleSignIn = async (credentialResponse) => {
  try {
    const apiResponse = await axiosInstance.post("/api/auth/google-auth", {
      credential: credentialResponse.credential,
    });

    // Rest of the function...
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    // Add more detailed error logging
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
    } else if (error.request) {
      console.error("No response received:", error.request);
    } else {
      console.error("Error message:", error.message);
    }
  }
};
