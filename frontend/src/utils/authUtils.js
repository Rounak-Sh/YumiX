// Verify if the stored token is valid
export const verifyStoredToken = async (axiosInstance) => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return false;

    // Try to get user profile with the token
    const response = await axiosInstance.get("/api/auth/verify", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data.success;
  } catch (error) {
    console.error("Token verification failed:", error);
    return false;
  }
};

// Parse JWT token (without verification)
export const parseJwt = (token) => {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch (e) {
    return null;
  }
};

// Check if token is expired
export const isTokenExpired = (token) => {
  const decodedToken = parseJwt(token);
  if (!decodedToken) return true;

  const currentTime = Date.now() / 1000;
  return decodedToken.exp < currentTime;
};
