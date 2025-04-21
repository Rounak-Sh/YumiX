// Regular expressions for validation
const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  otp: /^[0-9]{6}$/,
  // Admin password has simpler requirements than user password
  password: /^.{6,}$/,
};

// Validation functions
export const validateEmail = (email) => {
  if (!email) return "Email is required";
  if (!VALIDATION_PATTERNS.email.test(email))
    return "Please enter a valid email address";
  return "";
};

export const validatePassword = (password) => {
  if (!password) return "Password is required";
  if (!VALIDATION_PATTERNS.password.test(password))
    return "Password must be at least 6 characters long";
  return "";
};

export const validateConfirmPassword = (password, confirmPassword) => {
  if (!confirmPassword) return "Confirm password is required";
  if (password !== confirmPassword) return "Passwords do not match";
  return "";
};

export const validateOTP = (otp) => {
  if (!otp) return "OTP is required";
  if (!VALIDATION_PATTERNS.otp.test(otp)) return "OTP must be 6 digits";
  return "";
};

// Form validation functions
export const validateLoginForm = (data) => {
  const errors = {};

  // Check if all fields are empty
  const allFieldsEmpty = Object.values(data).every((value) => !value);
  if (allFieldsEmpty) {
    errors.general = "Fields can't be empty";
    return errors;
  }

  // Sequential validation - return first error encountered
  if (!data.email) {
    errors.email = "Email is required";
    return errors;
  } else if (!VALIDATION_PATTERNS.email.test(data.email)) {
    errors.email = "Please enter a valid email address";
    return errors;
  }

  if (!data.password) {
    errors.password = "Password is required";
    return errors;
  }

  return errors;
};

export const validateResetPasswordForm = (values) => {
  const errors = {};

  if (!values.newPassword) {
    errors.newPassword = "Password is required";
    return errors;
  } else if (!VALIDATION_PATTERNS.password.test(values.newPassword)) {
    errors.newPassword = "Password must be at least 6 characters long";
    return errors;
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = "Confirm password is required";
    return errors;
  } else if (values.newPassword !== values.confirmPassword) {
    errors.confirmPassword = "Passwords do not match";
    return errors;
  }

  return errors;
};

export const validateOtpForm = (values) => {
  const errors = {};

  if (!values.otp) {
    errors.otp = "OTP is required";
    return errors;
  } else if (!VALIDATION_PATTERNS.otp.test(values.otp)) {
    errors.otp = "OTP must be 6 digits";
    return errors;
  }

  return errors;
};

// Common error messages
export const errorMessages = {
  offline: "You are offline. Please check your internet connection.",
  emailRequired: "Please enter your email address first",
  adminOnly:
    "This email is registered for user login. Please use the user login page.",
  accountNotFound: "Admin account not found",
  invalidCredentials: "Invalid email or password",
  otpExpired: "OTP has expired. Please request a new one.",
  invalidOtp: "Invalid OTP. Please check and try again.",
  serverError: "Something went wrong. Please try again later.",
};

// API error handler
export const getErrorMessage = (error) => {
  if (!error.response) {
    return errorMessages.networkError;
  }

  const status = error.response.status;
  const message = error.response.data?.message;

  switch (status) {
    case 400:
      return message || errorMessages.invalidCredentials;
    case 401:
      return message || errorMessages.unauthorized;
    case 403:
      if (message?.includes("user")) {
        return errorMessages.adminOnly;
      }
      return message || errorMessages.unauthorized;
    case 404:
      return message || errorMessages.accountNotFound;
    case 408:
      return errorMessages.sessionExpired;
    case 500:
      return errorMessages.serverError;
    default:
      return message || errorMessages.serverError;
  }
};
