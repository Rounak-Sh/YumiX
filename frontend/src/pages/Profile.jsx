import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import SubscriptionInfo from "../components/SubscriptionInfo";
import {
  FaUser,
  FaEnvelope,
  FaCalendarAlt,
  FaEdit,
  FaPhone,
  FaKey,
  FaCamera,
  FaShieldAlt,
} from "react-icons/fa";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../context/AuthContext";
import {
  updatePreferences,
  getActivityStats,
  deactivateAccount,
  updateProfile,
  uploadProfileImage,
  updatePassword,
  refreshUser,
  requestUpdateOTP,
  updateProfileWithOTP,
} from "../services/userService";
import { showToast } from "../utils/toast";
import { ProfileOtpVerification } from "../components";

const Profile = () => {
  const navigate = useNavigate();
  const { user: authUser, logout } = useAuth();
  const [userData, setUserData] = useState({
    name: "",
    email: "",
    phone: "",
    joinDate: "",
    profileImage:
      "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzIzNDg2QSIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iMzAiIHI9IjIwIiBmaWxsPSIjZWVlZWVlIi8+PHBhdGggZD0iTTI1LDk1IHYtMTAgYzAtMTUgMTAtMjUgMjUtMjUgaDAgYzE1LDAgMjUsMTAgMjUsMjUgdjEwIiBmaWxsPSIjZWVlZWVlIi8+PC9zdmc+", // Data URL of a simple avatar
  });
  const [loading, setLoading] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [activityStats, setActivityStats] = useState({
    viewedRecipes: 0,
    savedRecipes: 0,
    searchesMade: 0,
  });

  // States for profile edit
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({
    name: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    changePassword: false,
  });
  const [profileLoading, setProfileLoading] = useState(false);

  // States for email/phone editing
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [otpData, setOtpData] = useState({
    code: "",
    type: "",
    sent: false,
    error: "",
    loading: false,
    verifying: false,
    expires: null,
  });

  // States for OTP modal
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpUpdateType, setOtpUpdateType] = useState(""); // email, phone, or password
  const [updateDataForOtp, setUpdateDataForOtp] = useState(null);

  // Reference for file input
  const fileInputRef = useRef(null);

  // Add state for password
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Toggle password visibility
  const togglePasswordVisibility = (field) => {
    setShowPassword((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  // Initial data fetching
  useEffect(() => {
    // Fetch user data from context and API
    const fetchUserData = async () => {
      setLoading(true);
      try {
        if (authUser) {
          // First set data from auth context
          setUserData({
            name: authUser.name || "User",
            email: authUser.email || "user@example.com",
            phone: authUser.phone || "",
            joinDate: authUser.createdAt || new Date().toISOString(),
            profileImage:
              authUser.profileImage ||
              authUser.profilePicture ||
              "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzIzNDg2QSIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iMzAiIHI9IjIwIiBmaWxsPSIjZWVlZWVlIi8+PHBhdGggZD0iTTI1LDk1IHYtMTAgYzAtMTUgMTAtMjUgMjUtMjUgaDAgYzE1LDAgMjUsMTAgMjUsMjUgdjEwIiBmaWxsPSIjZWVlZWVlIi8+PC9zdmc+", // Data URL of a simple avatar
          });

          // Then try to get fresh data from API using the refreshUser service
          const response = await refreshUser();
          if (response.success) {
            const apiUser = response.data;
            setUserData((prev) => ({
              ...prev,
              name: apiUser.name || prev.name,
              email: apiUser.email || prev.email,
              phone: apiUser.phone || prev.phone,
              joinDate: apiUser.createdAt || prev.joinDate,
              profileImage:
                apiUser.profileImage ||
                apiUser.profilePicture ||
                prev.profileImage,
            }));

            // Initialize edit data
            setEditData({
              name: apiUser.name || authUser.name || "User",
              currentPassword: "",
              newPassword: "",
              confirmPassword: "",
              changePassword: false,
            });

            // Set user preferences if available
            if (apiUser.preferences) {
              setEmailNotifications(
                apiUser.preferences.emailNotifications !== false
              );
              setTwoFactorAuth(apiUser.preferences.twoFactorAuth === true);
            }

            // Fetch activity stats
            const statsResponse = await getActivityStats();
            if (statsResponse.success) {
              setActivityStats(statsResponse.data);
            }
          }
        } else {
          // Redirect to login if no user data is found
          navigate("/login");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        showToast.error("Failed to load profile data");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [authUser, navigate]);

  // Handle logout
  const handleLogout = () => {
    logout();
    showToast.success("Logged out successfully");
    navigate("/login");
  };

  const handleEditProfile = () => {
    setEditMode(true);
    setEditData({
      name: userData.name,
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
      changePassword: false,
    });
    setNewEmail(userData.email);
    setNewPhone(userData.phone || "");
    // Reset OTP data when entering edit mode
    setOtpData({
      code: "",
      type: "",
      sent: false,
      error: "",
      loading: false,
      verifying: false,
      expires: null,
    });
  };

  // Handle profile image change
  const handleProfileImageClick = () => {
    fileInputRef.current.click();
  };

  const handleProfileImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/gif"];
    if (!validTypes.includes(file.type)) {
      showToast.error("Please select a valid image file (JPEG, PNG, or GIF)");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showToast.error("Image size should be less than 2MB");
      return;
    }

    try {
      setProfileLoading(true);

      // Upload image using the service function
      const response = await uploadProfileImage(file);

      if (response.success) {
        // Determine which image URL to use (backend might return profileImage or profilePicture)
        const imageUrl =
          response.data?.profileImage || response.data?.profilePicture;

        if (imageUrl) {
          // Update local state
          setUserData((prev) => ({
            ...prev,
            profileImage: imageUrl,
          }));

          // Refresh user data to ensure everything is up to date
          await refreshUser();

          showToast.success("Profile image updated successfully");
        } else {
          showToast.error("Image URL not found in response");
        }
      } else {
        showToast.error(response.message || "Failed to update profile image");
      }
    } catch (error) {
      console.error("Error updating profile image:", error);
      showToast.error("Failed to update profile image");
    } finally {
      setProfileLoading(false);
    }
  };

  // Handle all profile update fields
  const handleProfileSave = async (useVerificationPage = true) => {
    try {
      setProfileLoading(true);

      // Check for changes in sensitive information (email, phone, or password)
      const emailChanged =
        newEmail !== userData.email && newEmail.trim() !== "";
      const phoneChanged =
        newPhone !== userData.phone && newPhone.trim() !== "";
      const passwordChanged = editData.changePassword === true;

      // Check if any sensitive info has changed
      if (emailChanged || phoneChanged || passwordChanged) {
        // Validation checks
        if (emailChanged) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(newEmail)) {
            showToast.error("Please enter a valid email address");
            setProfileLoading(false);
            return;
          }
        }

        if (phoneChanged) {
          const phoneRegex = /^\+?[0-9]{10,15}$/;
          if (!phoneRegex.test(newPhone)) {
            showToast.error(
              "Please enter a valid phone number (10-15 digits, can start with +)"
            );
            setProfileLoading(false);
            return;
          }
        }

        if (passwordChanged) {
          if (editData.newPassword !== editData.confirmPassword) {
            showToast.error("New passwords do not match");
            setProfileLoading(false);
            return;
          }

          if (editData.newPassword.length < 8) {
            showToast.error("Password must be at least 8 characters long");
            setProfileLoading(false);
            return;
          }

          if (!editData.currentPassword) {
            showToast.error("Current password is required");
            setProfileLoading(false);
            return;
          }
        }

        if (useVerificationPage) {
          // Determine which field to verify first (prioritize email)
          let typeToVerify;
          let dataToUpdate = {};

          if (emailChanged) {
            typeToVerify = "email";
            dataToUpdate = { email: newEmail };
          } else if (phoneChanged) {
            typeToVerify = "phone";
            dataToUpdate = { phone: newPhone };
          } else if (passwordChanged) {
            typeToVerify = "password";
            dataToUpdate = {
              currentPassword: editData.currentPassword,
              newPassword: editData.newPassword,
            };
          }

          console.log("[DEBUG] Setting up for OTP verification:", {
            type: typeToVerify,
            data: dataToUpdate,
          });

          // Set up OTP modal
          setOtpUpdateType(typeToVerify);
          setUpdateDataForOtp(dataToUpdate);
          setShowOtpModal(true);
          setProfileLoading(false);
          return;
        } else {
          // If no sensitive info changed, just update display name and password if needed
          const response = await updateProfile({
            name: editData.name,
          });

          if (response.success) {
            setUserData((prev) => ({
              ...prev,
              name: editData.name,
            }));

            // If password change is requested, update password
            if (editData.changePassword) {
              // Validate passwords
              if (editData.newPassword !== editData.confirmPassword) {
                showToast.error("New passwords do not match");
                setProfileLoading(false);
                return;
              }

              if (editData.newPassword.length < 8) {
                showToast.error("Password must be at least 8 characters long");
                setProfileLoading(false);
                return;
              }

              const passwordResponse = await updatePassword({
                currentPassword: editData.currentPassword,
                newPassword: editData.newPassword,
                confirmPassword: editData.confirmPassword,
              });

              if (!passwordResponse.success) {
                showToast.error(
                  passwordResponse.message || "Failed to update password"
                );
                setProfileLoading(false);
                return;
              }

              showToast.success("Password updated successfully");
            }

            setEditMode(false);

            // Refresh user data to ensure everything is up to date
            await refreshUser();

            showToast.success("Profile updated successfully");
          } else {
            showToast.error(response.message || "Failed to update profile");
          }
        }
      } else {
        // If no sensitive info changed, just update display name and password if needed
        const response = await updateProfile({
          name: editData.name,
        });

        if (response.success) {
          setUserData((prev) => ({
            ...prev,
            name: editData.name,
          }));

          // If password change is requested, update password
          if (editData.changePassword) {
            // Validate passwords
            if (editData.newPassword !== editData.confirmPassword) {
              showToast.error("New passwords do not match");
              setProfileLoading(false);
              return;
            }

            if (editData.newPassword.length < 8) {
              showToast.error("Password must be at least 8 characters long");
              setProfileLoading(false);
              return;
            }

            const passwordResponse = await updatePassword({
              currentPassword: editData.currentPassword,
              newPassword: editData.newPassword,
              confirmPassword: editData.confirmPassword,
            });

            if (!passwordResponse.success) {
              showToast.error(
                passwordResponse.message || "Failed to update password"
              );
              setProfileLoading(false);
              return;
            }

            showToast.success("Password updated successfully");
          }

          setEditMode(false);

          // Refresh user data to ensure everything is up to date
          await refreshUser();

          showToast.success("Profile updated successfully");
        }
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      showToast.error("Failed to update profile");
    } finally {
      setProfileLoading(false);
    }
  };

  // Handle editData field changes
  const handleEditDataChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleEmailNotificationsChange = async (e) => {
    const isChecked = e.target.checked;
    setEmailNotifications(isChecked);

    try {
      const response = await updatePreferences({
        emailNotifications: isChecked,
      });

      if (response.success) {
        // Refresh user data to ensure preferences are up to date
        await refreshUser();

        showToast.success(
          isChecked
            ? "Email notifications enabled"
            : "Email notifications disabled"
        );
      } else {
        // Revert if failed
        setEmailNotifications(!isChecked);
        showToast.error("Failed to update notification settings");
      }
    } catch (error) {
      // Revert if failed
      setEmailNotifications(!isChecked);
      showToast.error("Failed to update notification settings");
      console.error("Error updating notification settings:", error);
    }
  };

  const handleTwoFactorAuthChange = async (e) => {
    const isChecked = e.target.checked;

    // If enabling 2FA, we would typically show a setup flow
    // For now, we'll just show a message
    if (isChecked) {
      showToast.info("Two-factor authentication setup coming soon!");
      return;
    }

    setTwoFactorAuth(isChecked);

    try {
      const response = await updatePreferences({ twoFactorAuth: isChecked });

      if (response.success) {
        // Refresh user data to ensure preferences are up to date
        await refreshUser();

        showToast.success(
          isChecked
            ? "Two-factor authentication enabled"
            : "Two-factor authentication disabled"
        );
      } else {
        // Revert if failed
        setTwoFactorAuth(!isChecked);
        showToast.error("Failed to update two-factor authentication");
      }
    } catch (error) {
      // Revert if failed
      setTwoFactorAuth(!isChecked);
      showToast.error("Failed to update two-factor authentication");
      console.error("Error updating two-factor auth settings:", error);
    }
  };

  const handleDeleteAccountClick = () => {
    setShowDeleteModal(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteConfirmation("");
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmation !== "DEACTIVATE") {
      showToast.error(
        'Please type "DEACTIVATE" to confirm account deactivation'
      );
      return;
    }

    try {
      const response = await deactivateAccount();
      if (response.success) {
        showToast.success("Account deactivated successfully");
        logout();
        navigate("/login");
      } else {
        showToast.error("Failed to deactivate account");
      }
    } catch (error) {
      console.error("Error deactivating account:", error);
      showToast.error("Error deactivating account. Please try again later.");
    } finally {
      setShowDeleteModal(false);
      setDeleteConfirmation("");
    }
  };

  // Format date to readable format
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Handle OTP input change
  const handleOtpChange = (e) => {
    setOtpData({
      ...otpData,
      code: e.target.value,
      error: "",
    });
  };

  // Request OTP for email or phone update
  const handleRequestOTP = async (type) => {
    try {
      setOtpData({
        ...otpData,
        loading: true,
        error: "",
        sent: false,
        type,
        code: "",
      });

      // Include the new email/phone in the request so OTP is sent to the new address
      const targetValue = type === "email" ? newEmail : newPhone;
      const response = await requestUpdateOTP(type, targetValue);

      if (response.success) {
        showToast.success(
          `Verification code sent to your new ${
            type === "email" ? "email address" : "phone number"
          }`
        );
        setOtpData({
          ...otpData,
          sent: true,
          loading: false,
          type,
          code: "",
          expires: new Date().getTime() + 10 * 60 * 1000, // 10 minutes expiry
        });
      } else {
        setOtpData({
          ...otpData,
          loading: false,
          error:
            response.message ||
            `Failed to send verification code to your ${type}`,
          sent: false,
        });
        showToast.error(response.message || `Failed to send verification code`);
      }
    } catch (error) {
      console.error(`Error requesting ${type} OTP:`, error);
      setOtpData({
        ...otpData,
        loading: false,
        error: `Failed to send verification code to your ${type}`,
        sent: false,
      });
      showToast.error(`Failed to send verification code. Please try again.`);
    }
  };

  // Verify OTP and update profile
  const handleVerifyOTP = async () => {
    if (otpData.code.length !== 6) {
      showToast.error("Please enter all digits of the OTP");
      return;
    }

    try {
      setOtpData((prev) => ({
        ...prev,
        verifying: true,
        error: "",
      }));

      // Important: Send clear request to update with OTP, specifying the type
      // This explicitly tells the backend which field to update and with what value
      const response = await updateProfileWithOTP({
        type: otpData.type,
        otp: otpData.code,
        // Explicitly include the new value to update to
        [otpData.type]: otpData.type === "email" ? newEmail : newPhone,
        // Add the sendToNew parameter to ensure OTP is validated against the new contact info
        sendToNew: true,
      });

      console.log(
        `OTP verification response for ${otpData.type} update:`,
        response
      );

      if (response.success) {
        showToast.success(`Your ${otpData.type} has been updated successfully`);

        // If this was email verification and phone also needs to be verified, start that process
        const phoneChanged =
          newPhone !== userData.phone && newPhone.trim() !== "";
        if (otpData.type === "email" && phoneChanged) {
          // Request OTP for phone next
          await handleRequestOTP("phone");
          return;
        }

        // All sensitive fields are now verified, continue with name and password updates if needed
        let isSuccess = true;

        // Update display name if changed
        if (editData.name !== userData.name) {
          const profileResponse = await updateProfile({
            name: editData.name,
          });

          if (!profileResponse.success) {
            showToast.error(
              profileResponse.message || "Failed to update display name"
            );
            isSuccess = false;
          }
        }

        // Handle password change if needed
        if (editData.changePassword) {
          if (editData.newPassword !== editData.confirmPassword) {
            showToast.error("New passwords do not match");
          } else if (editData.newPassword.length < 8) {
            showToast.error("Password must be at least 8 characters long");
          } else {
            const passwordResponse = await updatePassword({
              currentPassword: editData.currentPassword,
              newPassword: editData.newPassword,
              confirmPassword: editData.confirmPassword,
            });

            if (passwordResponse.success) {
              showToast.success("Password updated successfully");
            } else {
              showToast.error(
                passwordResponse.message || "Failed to update password"
              );
              isSuccess = false;
            }
          }
        }

        // Reset states and exit edit mode
        setOtpData({
          code: "",
          loading: false,
          sent: false,
          error: "",
          verifying: false,
          type: "",
          expires: null,
        });

        setEditMode(false);

        // Refresh user data to ensure everything is up to date
        await refreshUser();

        if (isSuccess) {
          showToast.success("Profile updated successfully");
        }
      } else {
        // Show the error message from the API response
        const errorMessage =
          response.message || "OTP verification failed. Please try again.";

        console.error("OTP verification failed:", errorMessage);

        // More specific error handling based on error message
        if (response.message?.includes("expired")) {
          showToast.error(
            "Verification code has expired. Please request a new code."
          );
        } else if (response.message?.includes("invalid")) {
          showToast.error(
            "Invalid verification code. Please check and try again."
          );
        } else {
          showToast.error(errorMessage);
        }

        setOtpData((prev) => ({
          ...prev,
          verifying: false,
          error: errorMessage,
        }));
      }
    } catch (error) {
      console.error(`Error verifying OTP:`, error);
      setOtpData({
        ...otpData,
        verifying: false,
        error: "Failed to verify code",
      });
      showToast.error("Failed to verify code. Please try again.");
    }
  };

  // Handle email input change
  const handleEmailChange = (e) => {
    setNewEmail(e.target.value);
  };

  // Handle phone input change
  const handlePhoneChange = (e) => {
    setNewPhone(e.target.value);
  };

  // Show email update form
  const handleShowEmailForm = () => {
    setNewEmail(userData.email);
    setOtpData({
      otp: "",
      type: "email",
      otpSent: false,
      otpVerified: false,
    });
  };

  // Show phone update form
  const handleShowPhoneForm = () => {
    setNewPhone(userData.phone || "");
    setOtpData({
      otp: "",
      type: "phone",
      otpSent: false,
      otpVerified: false,
    });
  };

  // Cancel email update
  const handleCancelEmailUpdate = () => {
    setNewEmail("");
    setOtpData({
      otp: "",
      type: "",
      otpSent: false,
      otpVerified: false,
    });
  };

  // Cancel phone update
  const handleCancelPhoneUpdate = () => {
    setNewPhone("");
    setOtpData({
      otp: "",
      type: "",
      otpSent: false,
      otpVerified: false,
    });
  };

  // Handle OTP verification success
  const handleOtpVerificationSuccess = async (updatedData) => {
    try {
      console.log("[DEBUG] OTP verification succeeded:", updatedData);

      // Handle the response based on what was updated
      if (otpUpdateType === "email") {
        setUserData((prev) => ({
          ...prev,
          email: updatedData.email || updateDataForOtp.email,
        }));
        showToast.success("Email updated successfully");
      } else if (otpUpdateType === "phone") {
        setUserData((prev) => ({
          ...prev,
          phone: updatedData.phone || updateDataForOtp.phone,
        }));
        showToast.success("Phone number updated successfully");
      } else if (otpUpdateType === "password") {
        showToast.success("Password updated successfully");
      }

      // Update profile name if it was changed
      if (editData.name !== userData.name) {
        const profileResponse = await updateProfile({
          name: editData.name,
        });

        if (profileResponse.success) {
          setUserData((prev) => ({
            ...prev,
            name: editData.name,
          }));
        } else {
          showToast.error(
            profileResponse.message || "Failed to update display name"
          );
        }
      }

      // Refresh user data to ensure all changes are reflected
      await refreshUser();

      // Reset states
      setShowOtpModal(false);
      setOtpUpdateType("");
      setUpdateDataForOtp(null);
      setEditMode(false);
    } catch (error) {
      console.error("[DEBUG] Error handling OTP verification success:", error);
      showToast.error("Error applying updates. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFCF50]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-white mb-6">
        <span className="border-b-4 border-[#FFCF50] pb-1">My Profile</span>
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Information */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-[#23486A] p-4 text-white">
              <h3 className="text-lg font-semibold flex items-center">
                <FaUser className="mr-2 text-[#FFCF50]" />
                Personal Information
              </h3>
            </div>

            <div className="p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8">
                <div className="relative">
                  <img
                    src={userData.profileImage}
                    alt={userData.name}
                    className="w-24 h-24 rounded-full border-4 border-[#FFCF50] object-cover"
                  />
                  {profileLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
                      <div className="animate-spin h-8 w-8 border-2 border-[#FFCF50] rounded-full border-t-transparent"></div>
                    </div>
                  ) : (
                    <button
                      onClick={handleProfileImageClick}
                      className="absolute bottom-0 right-0 bg-[#23486A] text-white p-2 rounded-full border-2 border-[#FFCF50]">
                      <FaCamera className="w-3 h-3" />
                    </button>
                  )}
                  {/* Hidden file input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleProfileImageChange}
                    className="hidden"
                    accept="image/jpeg, image/png, image/gif"
                  />
                </div>
                <div>
                  {!editMode && (
                    <>
                      <h2 className="text-2xl font-bold text-[#23486A]">
                        {userData.name}
                      </h2>
                      <p className="text-gray-500 flex items-center mt-1">
                        <FaCalendarAlt className="mr-2 text-[#23486A]/60" />
                        Member since {formatDate(userData.joinDate)}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {editMode ? (
                <div className="space-y-6">
                  {/* Combined Edit Form */}
                  <div className="space-y-5">
                    {/* Display Name Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Display Name
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={editData.name}
                        onChange={handleEditDataChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#23486A]"
                      />
                    </div>

                    {/* Email Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Email Address
                      </label>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="email"
                            value={newEmail}
                            onChange={handleEmailChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#23486A]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Phone Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Phone Number
                      </label>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="tel"
                            value={newPhone}
                            onChange={handlePhoneChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#23486A]"
                            placeholder="+1234567890"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Password Change Option */}
                    <div className="mt-3 border-t pt-3">
                      <div className="flex items-center mb-3">
                        <FaKey className="text-[#23486A] mr-2" />
                        <span className="font-medium text-[#23486A]">
                          Password Management
                        </span>
                      </div>
                      <div className="flex items-center mb-3">
                        <input
                          type="checkbox"
                          id="changePassword"
                          name="changePassword"
                          checked={editData.changePassword}
                          onChange={handleEditDataChange}
                          className="h-4 w-4 text-[#23486A] border-gray-300 rounded"
                        />
                        <label
                          htmlFor="changePassword"
                          className="ml-2 block text-sm font-medium text-gray-700">
                          Change my password
                        </label>
                      </div>

                      {editData.changePassword && (
                        <div className="space-y-3 pl-6 mt-2">
                          <div className="relative">
                            <label className="block text-sm font-medium text-gray-500 mb-1">
                              Current Password
                            </label>
                            <input
                              type={showPassword.current ? "text" : "password"}
                              name="currentPassword"
                              value={editData.currentPassword}
                              onChange={handleEditDataChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#23486A]"
                              required={editData.changePassword}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                togglePasswordVisibility("current")
                              }
                              className="absolute right-3 bottom-2.5 text-gray-500 hover:text-gray-700">
                              {showPassword.current ? (
                                <EyeSlashIcon className="h-5 w-5" />
                              ) : (
                                <EyeIcon className="h-5 w-5" />
                              )}
                            </button>
                          </div>

                          <div className="relative">
                            <label className="block text-sm font-medium text-gray-500 mb-1">
                              New Password
                            </label>
                            <input
                              type={showPassword.new ? "text" : "password"}
                              name="newPassword"
                              value={editData.newPassword}
                              onChange={handleEditDataChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#23486A]"
                              required={editData.changePassword}
                              minLength={8}
                            />
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility("new")}
                              className="absolute right-3 bottom-7 text-gray-500 hover:text-gray-700">
                              {showPassword.new ? (
                                <EyeSlashIcon className="h-5 w-5" />
                              ) : (
                                <EyeIcon className="h-5 w-5" />
                              )}
                            </button>
                            <p className="text-xs text-gray-500 mt-1">
                              Password must be at least 8 characters long
                            </p>
                          </div>

                          <div className="relative">
                            <label className="block text-sm font-medium text-gray-500 mb-1">
                              Confirm New Password
                            </label>
                            <input
                              type={showPassword.confirm ? "text" : "password"}
                              name="confirmPassword"
                              value={editData.confirmPassword}
                              onChange={handleEditDataChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#23486A]"
                              required={editData.changePassword}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                togglePasswordVisibility("confirm")
                              }
                              className="absolute right-3 bottom-2.5 text-gray-500 hover:text-gray-700">
                              {showPassword.confirm ? (
                                <EyeSlashIcon className="h-5 w-5" />
                              ) : (
                                <EyeIcon className="h-5 w-5" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Form Buttons */}
                    <div className="flex flex-wrap gap-4 pt-4">
                      <button
                        onClick={() => handleProfileSave(true)}
                        disabled={profileLoading}
                        className="px-4 py-2 bg-[#FFCF50] text-[#23486A] font-bold rounded-md border-2 border-[#23486A] shadow-[4px_4px_0px_0px_rgba(35,72,106,0.5)]
                                   active:translate-y-1 active:shadow-none hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {profileLoading ? "Saving..." : "Save All Changes"}
                      </button>
                      <button
                        onClick={() => setEditMode(false)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 font-bold rounded-md border-2 border-gray-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]
                                   hover:bg-gray-300 transition-colors active:shadow-none active:translate-x-1 active:translate-y-1">
                        Cancel
                      </button>
                      <button
                        onClick={handleDeleteAccountClick}
                        className="text-red-600 font-medium hover:text-red-800 hover:underline transition-colors pl-8">
                        Deactivate Account
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Email Address
                    </label>
                    <div className="flex items-center justify-between bg-[#23486A]/5 p-3 rounded-lg">
                      <div className="flex items-center">
                        <FaEnvelope className="text-[#23486A] mr-3" />
                        <span className="text-[#23486A]">{userData.email}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Phone Number
                    </label>
                    {userData.phone ? (
                      <div className="flex items-center justify-between bg-[#23486A]/5 p-3 rounded-lg">
                        <div className="flex items-center">
                          <FaPhone className="text-[#23486A] mr-3" />
                          <span className="text-[#23486A]">
                            {userData.phone}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between bg-[#23486A]/5 p-3 rounded-lg">
                        <span className="text-gray-500 italic">
                          No phone number added
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <button
                      onClick={handleEditProfile}
                      className="px-4 py-2 bg-[#FFCF50] text-[#23486A] font-bold rounded-md border-2 border-[#23486A] shadow-[4px_4px_0px_0px_rgba(35,72,106,0.5)]
                               hover:bg-[#f0c040] transition-colors active:shadow-none active:translate-x-1 active:translate-y-1">
                      Edit Profile & Settings
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Subscription Information and Activity Summary */}
        <div className="lg:col-span-1">
          <SubscriptionInfo />

          {/* Activity summary integrated directly into the profile section */}
          <div className="mt-6 bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-[#23486A] p-4 text-white flex justify-between items-center">
              <h3 className="text-lg font-semibold">Activity Summary</h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 gap-3">
                <div className="bg-[#23486A]/5 p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Recipes Viewed
                    </span>
                    <span className="font-medium text-lg text-[#23486A]">
                      {activityStats.viewedRecipes || 0}
                    </span>
                  </div>
                </div>
                <div className="bg-[#23486A]/5 p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Recipes Saved
                    </span>
                    <span className="font-medium text-lg text-[#23486A]">
                      {activityStats.savedRecipes || 0}
                    </span>
                  </div>
                </div>
                <div className="bg-[#23486A]/5 p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Searches Made
                    </span>
                    <span className="font-medium text-lg text-[#23486A]">
                      {activityStats.searchesMade || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-xl font-bold text-red-600 mb-4">
              Deactivate Account
            </h3>
            <p className="text-gray-700 mb-4">
              Are you sure you want to deactivate your account? Your account
              will be disabled and you won't be able to log in.
            </p>
            <p className="text-gray-700 mb-2">
              Your data will be preserved, and you can contact support to
              reactivate your account in the future.
            </p>
            <p className="text-gray-700 mb-2">
              <Link
                to="/account-help"
                className="text-blue-600 hover:underline">
                Learn more about account deactivation
              </Link>
            </p>
            <p className="text-gray-700 mb-6">
              Type "DEACTIVATE" in the field below to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded mb-4"
              placeholder="Type DEACTIVATE here"
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelDelete}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
                Deactivate My Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add ProfileOtpVerification modal */}
      <ProfileOtpVerification
        isOpen={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        onSuccess={handleOtpVerificationSuccess}
        updateType={otpUpdateType}
        updateData={updateDataForOtp || {}}
      />
    </div>
  );
};

export default Profile;
