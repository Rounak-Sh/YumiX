// Regular expressions for validation
const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^(\+91[\-\s]?)?[0]?(91)?[6789]\d{9}$/,
  password:
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  otp: /^[0-9]{6}$/,
};

// Validation functions
export const validateName = (name) => {
  if (!name) return "Name is required";
  // if (name.length < 2) return "Name must be at least 2 characters long";
  if (name.length > 50) return "Name cannot exceed 50 characters";
  return "";
};

export const validateEmail = (email) => {
  if (!email) return "Email is required";
  if (!VALIDATION_PATTERNS.email.test(email))
    return "Please enter a valid email address";
  return "";
};

export const validatePhone = (phone) => {
  if (!phone) return "Phone number is required";
  if (!VALIDATION_PATTERNS.phone.test(phone))
    return "Please enter a valid Indian phone number";
  return "";
};

export const validatePassword = (password) => {
  if (!password) return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters long";
  if (!VALIDATION_PATTERNS.password.test(password)) {
    return "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character";
  }
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
export const validateLoginForm = (formData) => {
  const { emailOrPhone, password } = formData;

  if (!emailOrPhone || !password) {
    return "Please fill in all fields";
  }

  // Check if input matches either email or phone pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^(\+91[\-\s]?)?[0]?(91)?[6789]\d{9}$/;

  if (!emailRegex.test(emailOrPhone) && !phoneRegex.test(emailOrPhone)) {
    return "Please enter a valid email address or phone number";
  }

  // For login, we only check if password is provided, not its complexity
  if (!password) {
    return "Password is required";
  }

  return null; // Return null if validation passes
};

export const validateRegistrationForm = (values) => {
  const errors = {};

  // Check if all fields are empty
  const allFieldsEmpty = Object.values(values).every((value) => !value);
  if (allFieldsEmpty) {
    errors.general = "Fields can't be empty";
    return errors;
  }

  // Sequential validation - return first error encountered
  if (!values.name) {
    errors.name = "Name is required";
    return errors;
  }

  if (!values.email) {
    errors.email = "Email is required";
    return errors;
  } else if (!VALIDATION_PATTERNS.email.test(values.email)) {
    errors.email = "Please enter a valid email address";
    return errors;
  }

  if (!values.phone) {
    errors.phone = "Phone number is required";
    return errors;
  } else if (!VALIDATION_PATTERNS.phone.test(values.phone)) {
    errors.phone = "Please enter a valid Indian phone number";
    return errors;
  }

  if (!values.password) {
    errors.password = "Password is required";
    return errors;
  } else if (values.password.length < 8) {
    errors.password = "Password must be at least 8 characters long";
    return errors;
  } else if (!VALIDATION_PATTERNS.password.test(values.password)) {
    errors.password =
      "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character";
    return errors;
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = "Confirm password is required";
    return errors;
  } else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = "Passwords do not match";
    return errors;
  }

  return errors;
};

export const validateForgotPasswordForm = (values) => {
  const errors = {};

  if (!values.email && !values.phone) {
    errors.contact = "Please provide either email or phone number";
  } else if (values.email && !validateEmail(values.email)) {
    errors.email = validateEmail(values.email);
  } else if (values.phone && !validatePhone(values.phone)) {
    errors.phone = validatePhone(values.phone);
  }

  return errors;
};

export const validateResetPasswordForm = (values) => {
  const errors = {};

  const passwordError = validatePassword(values.newPassword);
  if (passwordError) errors.newPassword = passwordError;

  const confirmPasswordError = validateConfirmPassword(
    values.newPassword,
    values.confirmPassword
  );
  if (confirmPasswordError) errors.confirmPassword = confirmPasswordError;

  return errors;
};

export const validateOTPForm = (values) => {
  const errors = {};

  const otpError = validateOTP(values.otp);
  if (otpError) errors.otp = otpError;

  return errors;
};
