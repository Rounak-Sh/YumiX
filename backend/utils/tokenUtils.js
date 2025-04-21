import jwt from "jsonwebtoken";

export const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

export const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { valid: true, id: decoded.id };
  } catch (error) {
    return { valid: false, error: error.message };
  }
};

export const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });
};

export const generateAccessToken = (userId) => {
  try {
    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });
    console.log("Token generated successfully for user:", userId);
    return token;
  } catch (error) {
    console.error("Token generation error:", error);
    throw error;
  }
};
