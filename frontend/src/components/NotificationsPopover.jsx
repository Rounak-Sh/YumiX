import React, { useState, useEffect, useRef } from "react";
import axiosInstance from "../config/axios";
import { BellIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";
import { useTheme } from "../context/ThemeContext";
import { showToast } from "../utils/toast.jsx";

// Reduced polling interval - Check every 2 seconds instead of 30 seconds
const POLLING_INTERVAL = 2000;

const NotificationsPopover = ({ className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const popoverRef = useRef(null);
  const { isDarkMode } = useTheme();
  const refreshIntervalRef = useRef(null); // Ref to store interval ID
  const initialLoadDoneRef = useRef(false); // Track if initial load has happened
  const previousUnreadCountRef = useRef(0); // Track previous unread count

  // Simple function to just fetch the unread count
  const fetchNotificationCount = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      // Use a query parameter to indicate we only want the count
      const response = await axiosInstance.get(
        "/notifications/user?countOnly=true"
      );

      if (response.data.success) {
        const newUnreadCount = response.data.data.unreadCount;

        // If unread count increased, open the notifications panel
        if (newUnreadCount > previousUnreadCountRef.current) {
          console.log("New notifications detected:", newUnreadCount);
          setIsOpen(true);
          fetchNotifications(); // Fetch full notifications
        }

        setUnreadCount(newUnreadCount);
        previousUnreadCountRef.current = newUnreadCount;
      }
    } catch (error) {
      console.warn("Failed to fetch notification count:", error);
      // Don't reset the count on error to avoid flickering
    }
  };

  // Function to fetch full notifications
  const fetchNotifications = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      setLoading(true);
      console.log("Fetching notifications from:", "/notifications/user");
      const response = await axiosInstance.get("/notifications/user");

      if (response.data.success) {
        setNotifications(response.data.data.notifications);
        setUnreadCount(response.data.data.unreadCount);
        previousUnreadCountRef.current = response.data.data.unreadCount;
        initialLoadDoneRef.current = true;
      } else {
        console.warn("No notifications returned from API");
        setNotifications([]);
      }
    } catch (error) {
      console.warn("Failed to fetch notifications:", error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch notification count periodically and on mount
  useEffect(() => {
    // Fetch immediately on mount
    fetchNotificationCount();

    // Then set up interval to fetch periodically
    refreshIntervalRef.current = setInterval(
      fetchNotificationCount,
      POLLING_INTERVAL
    );

    // Clean up interval on unmount
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  // Handle clicks outside the popover
  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    // Attach the event listener
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [popoverRef]);

  // Function to handle the bell icon click
  const handleBellClick = () => {
    if (!isOpen) {
      // If opening the panel, fetch notifications
      setIsOpen(true);
      fetchNotifications();
    } else {
      // Just close the panel if it's already open
      setIsOpen(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      const response = await axiosInstance.put(
        `/notifications/user/${notificationId}/read`
      );

      if (response.data?.success) {
        // Update state
        setNotifications((prevNotifications) =>
          prevNotifications.map((notification) =>
            notification._id === notificationId
              ? { ...notification, read: true }
              : notification
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        showToast.success("Notification marked as read");
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
      showToast.error("Failed to mark notification as read");
      // Continue with optimistic UI update even if API fails
      setNotifications((prevNotifications) =>
        prevNotifications.map((notification) =>
          notification._id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await axiosInstance.put(`/notifications/user/read-all`);

      if (response.data?.success) {
        // Update all notifications to read
        setNotifications((prevNotifications) =>
          prevNotifications.map((notification) => ({
            ...notification,
            read: true,
          }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      // Continue with optimistic UI update even if API fails
      setNotifications((prevNotifications) =>
        prevNotifications.map((notification) => ({
          ...notification,
          read: true,
        }))
      );
      setUnreadCount(0);
    }
  };

  const clearNotifications = async () => {
    try {
      // Update UI immediately for better user experience
      const unreadNotifications = notifications.filter((n) => !n.read);
      setNotifications(unreadNotifications);
      setUnreadCount(unreadNotifications.length);
      showToast.success("Read notifications cleared");

      // Call API in the background
      await axiosInstance.delete(`/notifications/user/clear?all=true`);
    } catch (error) {
      console.error("Error clearing notifications:", error);
      // Already updated UI optimistically so no need to do it again
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Recent";

    try {
      const date = new Date(dateString);

      // Check if date is valid
      if (isNaN(date.getTime())) return "Recent";

      // For notifications today, show "X minutes/hours ago"
      const now = new Date();
      const isToday =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

      if (isToday) {
        return formatDistanceToNow(date, { addSuffix: true });
      }

      // For older notifications, show the date
      return format(date, "MMM d, yyyy");
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Recent";
    }
  };

  // Get notification icon based on type - now using simple colored circles instead of SVGs
  const getNotificationIcon = (type) => {
    switch (type) {
      case "referral":
        return (
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-500 font-bold">
            R
          </div>
        );
      case "subscription":
        return (
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-500 font-bold">
            S
          </div>
        );
      case "welcome":
        return (
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 font-bold">
            W
          </div>
        );
      case "recipe":
        return (
          <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-500 font-bold">
            R
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold">
            N
          </div>
        );
    }
  };

  // Define text and border classes based on theme
  const textColorClass = isDarkMode ? "text-white" : "text-[#23486A]";
  const borderClass = isDarkMode
    ? "border border-[#FFCF50]/40"
    : "border border-[#23486A]/60";

  return (
    <div className={`relative ${className}`} ref={popoverRef}>
      {/* Bell icon with notification indicator */}
      <button
        onClick={handleBellClick}
        className={`w-10 h-10 flex items-center justify-center relative rounded-full ${textColorClass} hover:${
          isDarkMode ? "text-[#FFCF50]" : "text-[#1A3A5F]"
        } focus:outline-none ${borderClass} transition-all duration-300`}>
        <BellIcon className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full h-5 w-5 flex items-center justify-center font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute z-50 mt-4 right-0 w-80 md:w-96 bg-white rounded-lg shadow-xl overflow-hidden"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}>
            {/* Header */}
            <div className="px-4 py-3 bg-[#23486A] text-white flex justify-between items-center">
              <h3 className="font-semibold text-sm">Notifications</h3>
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition-colors flex items-center">
                    <CheckIcon className="h-3 w-3 mr-1" />
                    Mark all read
                  </button>
                )}
                <button
                  onClick={clearNotifications}
                  className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition-colors flex items-center">
                  <XMarkIcon className="h-3 w-3 mr-1" />
                  Clear read
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-[350px] overflow-y-auto">
              {loading ? (
                <div className="py-6 px-4 text-center text-gray-500">
                  <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-b-transparent border-[#23486A]"></div>
                  <p>Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-6 px-4 text-center text-gray-500">
                  <p className="text-4xl mb-2">🔔</p>
                  <p>No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification._id || notification.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      notification.read ? "bg-white" : "bg-blue-50"
                    }`}
                    onClick={() =>
                      !notification.read &&
                      handleMarkAsRead(notification._id || notification.id)
                    }>
                    <div className="flex items-start p-4 cursor-pointer">
                      {/* Icon */}
                      {getNotificationIcon(notification.type)}

                      {/* Content */}
                      <div className="ml-3 flex-1">
                        {notification.title && (
                          <p className="font-semibold text-gray-900">
                            {notification.title}
                          </p>
                        )}
                        <p className="text-sm text-gray-600">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(
                            notification.createdAt || notification.date
                          )}
                        </p>
                      </div>

                      {/* Read indicator */}
                      {!notification.read && (
                        <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationsPopover;
