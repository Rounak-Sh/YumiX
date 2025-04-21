import { userValidation } from "../models/userModel.js";
import { tempUserValidation } from "../models/tempUserModel.js";
import Joi from "joi";

// Validation middleware factory
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessages = error.details.map((detail) => ({
        field: detail.path[0],
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errorMessages,
      });
    }

    next();
  };
};

// Auth validation middleware
export const validateRegister = validate(userValidation.register);
export const validateLogin = (req, res, next) => {
  const { emailOrPhone, password } = req.body;

  if (!emailOrPhone || !password) {
    return res.status(400).json({
      success: false,
      message: "Email/Phone and password are required",
    });
  }

  next();
};
export const validateForgotPassword = (req, res, next) => {
  const { emailOrPhone } = req.body;

  if (!emailOrPhone) {
    return res.status(400).json({
      success: false,
      message: "Email or phone number is required",
    });
  }

  next();
};
export const validateResetPassword = validate(userValidation.resetPassword);

export const validateVerifyOTP = (req, res, next) => {
  const isResetVerification = req.path.includes("verify-reset-otp");
  const schema = isResetVerification
    ? tempUserValidation.verifyResetOTP
    : tempUserValidation.verifyOTP;
  validate(schema)(req, res, next);
};

// Validate resend OTP request
export const validateResendOTP = (req, res, next) => {
  const { tempUserId } = req.body;

  if (!tempUserId) {
    return res.status(400).json({
      success: false,
      message: "User ID is required",
    });
  }

  next();
};

// Simple validation schemas
export const authValidation = {
  login: Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Please enter a valid email",
      "any.required": "Email is required",
    }),
    password: Joi.string().required().messages({
      "any.required": "Password is required",
    }),
  }),
};
