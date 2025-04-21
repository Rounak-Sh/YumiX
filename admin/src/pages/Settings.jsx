import { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { useAdmin } from "@/contexts/AdminContext";
import adminApi from "@/services/api";
import { showToast } from "@/utils/toast";
import ProfileOtpVerification from "@/components/ProfileOtpVerification";
import {
  UserCircleIcon,
  BellIcon,
  ShieldCheckIcon,
  PencilSquareIcon,
  KeyIcon,
} from "@heroicons/react/24/outline";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/solid";

const ProfileImage = ({ src, name, className }) => {
  const [imageError, setImageError] = useState(false);

  // Function to get initials from name
  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  if (imageError || !src) {
    return (
      <div
        className={`${className} bg-gray-200 flex items-center justify-center text-2xl font-semibold text-gray-600`}>
        {getInitials(name)}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      className={className}
      onError={() => setImageError(true)}
    />
  );
};

export default function Settings() {
  const { theme } = useOutletContext();
  const { admin, updateAdminData } = useAdmin();
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [localImage, setLocalImage] = useState(admin?.image || null);
  const [previewImage, setPreviewImage] = useState(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [preferences, setPreferences] = useState({
    loginAlerts: true,
    reportGeneration: true,
    userSignups: false,
    newSubscriptions: true,
    paymentAlerts: true,
  });
  const [tempPreferences, setTempPreferences] = useState({});
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    currentPassword: "",
    newPassword: "",
  });

  // New state for OTP verification
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpUpdateType, setOtpUpdateType] = useState(null); // "email" or "password"
  const [updateDataForOtp, setUpdateDataForOtp] = useState({});

  useEffect(() => {
    if (admin) {
      setFormData({
        name: admin.name || "",
        email: admin.email || "",
        currentPassword: "",
        newPassword: "",
      });
      setPreferences(admin.preferences || {});
      setTempPreferences(admin.preferences || {});
      setLocalImage(admin.image || null);
      setPreviewImage(null);
    }
  }, [admin]);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
    if (!validTypes.includes(file.type)) {
      showToast.error("Please select a valid image file (JPEG, JPG, PNG, GIF)");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast.error("File size should be less than 5MB");
      return;
    }

    // Store the file for later upload
    setSelectedFile(file);

    // Create a preview URL
    const previewUrl = URL.createObjectURL(file);
    setPreviewImage(previewUrl);
  };

  const handlePreferenceChange = (key) => {
    setTempPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      let hasChanges = false;

      // Upload image if one is selected
      if (selectedFile) {
        const formData = new FormData();
        formData.append("image", selectedFile);

        const response = await adminApi.updateProfilePicture(formData);

        if (response.data.success) {
          const imageUrl = response.data.image;
          setLocalImage(imageUrl);
          setSelectedFile(null);
          setPreviewImage(null);
          showToast.success("Profile picture updated successfully");
          hasChanges = true;
        }
      }

      // Check if email is being changed
      const isEmailChange = formData.email !== admin?.email;

      // Check if password is being changed
      const isPasswordChange = formData.currentPassword && formData.newPassword;

      if (isEmailChange) {
        // Setup for email change with OTP
        setOtpUpdateType("email");
        setUpdateDataForOtp({
          email: formData.email,
        });
        setShowOtpModal(true);
        setLoading(false);
        return;
      }

      if (isPasswordChange) {
        // Validate password inputs
        if (!formData.currentPassword) {
          showToast.error("Current password is required to change password");
          setLoading(false);
          return;
        }

        if (!formData.newPassword) {
          showToast.error("New password is required");
          setLoading(false);
          return;
        }

        // Setup for password change with OTP
        setOtpUpdateType("password");
        setUpdateDataForOtp({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        });
        setShowOtpModal(true);
        setLoading(false);
        return;
      }

      // For name change only, use the direct update endpoint
      if (formData.name !== admin?.name) {
        const response = await adminApi.updateProfile({
          name: formData.name,
        });

        if (response.data.success) {
          showToast.success("Profile updated successfully");
          hasChanges = true;
        }
      }

      // Update preferences if changed
      if (JSON.stringify(tempPreferences) !== JSON.stringify(preferences)) {
        await adminApi.updatePreferences(tempPreferences);
        setPreferences(tempPreferences);
        showToast.success("Preferences updated successfully");
        hasChanges = true;
      }

      // Update admin data only once after all changes
      if (hasChanges) {
        await updateAdminData();
      } else {
        showToast.info("No changes to save");
      }
    } catch (error) {
      showToast.error(
        error.response?.data?.message || "Failed to update profile"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    try {
      setLoading(true);
      await adminApi.updatePreferences(tempPreferences);
      setPreferences(tempPreferences);
      showToast.success("Preferences updated successfully");
    } catch (error) {
      showToast.error("Failed to update preferences");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerificationSuccess = async (updatedData) => {
    try {
      if (otpUpdateType === "email") {
        // Update email
        await adminApi.updateProfile({
          ...updatedData,
        });
        showToast.success("Email updated successfully");
      } else if (otpUpdateType === "password") {
        // Update password
        await adminApi.updatePassword(updatedData);
        showToast.success("Password updated successfully");
        setFormData({
          ...formData,
          currentPassword: "",
          newPassword: "",
        });
      }

      // Refresh admin data
      await updateAdminData();
      setShowOtpModal(false);
    } catch (error) {
      showToast.error("Error updating profile after verification");
    }
  };

  const tabs = [
    {
      id: "profile",
      name: "Profile Settings",
      icon: UserCircleIcon,
    },
    {
      id: "security",
      name: "Security",
      icon: ShieldCheckIcon,
    },
    {
      id: "notifications",
      name: "Notifications",
      icon: BellIcon,
    },
  ];

  function getPreferenceDescription(key) {
    const descriptions = {
      loginAlerts: "Get notified about login attempts",
      reportGeneration: "Receive notifications when reports are generated",
      userSignups: "Get notified when new users sign up",
      newSubscriptions: "Get notified about new subscriptions",
      paymentAlerts: "Get notifications for payment-related activities",
    };
    return descriptions[key] || key;
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "profile":
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="h-28 w-28 rounded-2xl bg-black text-white flex items-center justify-center text-3xl font-semibold overflow-hidden">
                  {previewImage ? (
                    <img
                      src={previewImage}
                      alt="Profile Preview"
                      className="w-28 h-28 object-cover"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  ) : (
                    <ProfileImage
                      src={localImage}
                      name={formData.name}
                      className="w-28 h-28 object-cover"
                    />
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  accept="image/jpeg,image/jpg,image/png,image/gif"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 p-2 rounded-lg bg-white shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50">
                  {loading ? (
                    <div className="h-4 w-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : (
                    <PencilSquareIcon className="h-4 w-4 text-black" />
                  )}
                </button>
              </div>
              <div>
                <h3 className="text-lg font-medium text-black">
                  Profile Picture
                </h3>
                <p className="text-sm text-gray-600">
                  Update your profile picture
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg bg-gray-50 text-black border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg bg-gray-50 text-black border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>
        );

      case "security":
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-6">
              <div className="h-12 w-12 rounded-lg bg-black text-white flex items-center justify-center">
                <KeyIcon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-black">
                  Change Password
                </h3>
                <p className="text-sm text-gray-600">Update your password</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-50 text-black border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-black">
                  {showCurrentPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-50 text-black border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-black">
                  {showNewPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-6">
              <div className="h-12 w-12 rounded-lg bg-black text-white flex items-center justify-center">
                <BellIcon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-black">
                  Notification Settings
                </h3>
                <p className="text-sm text-gray-600">
                  Manage your notification settings
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {Object.entries(tempPreferences)
                .filter(
                  ([key]) => key !== "_id" && key !== "emailNotifications"
                )
                .map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between p-4 rounded-lg bg-white border border-gray-200">
                    <div>
                      <h4 className="text-sm font-medium text-black">
                        {key
                          .replace(/([A-Z])/g, " $1")
                          .replace(/^./, (str) => str.toUpperCase())}
                      </h4>
                      <p className="text-xs text-gray-600 mt-1">
                        {getPreferenceDescription(key)}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tempPreferences[key]}
                        onChange={() => handlePreferenceChange(key)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-400 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                    </label>
                  </div>
                ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto pt-4">
      <div className="mb-8">
        <h1 className={`text-2xl font-bold ${theme.text}`}>Settings</h1>
        <p className={`mt-1 text-sm ${theme.textSecondary}`}>
          Manage your account settings and preferences
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <div className="w-[650px] mx-auto">
          <div className="bg-black rounded-xl">
            <div className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? "text-white font-semibold"
                      : "text-gray-400 hover:text-gray-300"
                  }`}>
                  <tab.icon className="h-5 w-5" />
                  {tab.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="w-[800px] mx-auto">
          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-8">{renderTabContent()}</div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-4 mt-6 w-[800px] mx-auto">
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 text-gray-700 hover:text-black transition-colors">
          Cancel
        </button>
        <button
          onClick={handleSaveProfile}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Add OTP Verification Modal */}
      <ProfileOtpVerification
        isOpen={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        onSuccess={handleOtpVerificationSuccess}
        updateType={otpUpdateType}
        updateData={updateDataForOtp}
      />
    </div>
  );
}
