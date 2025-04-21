import { Fragment, useState, useEffect, useRef } from "react";
import { Menu, Transition } from "@headlessui/react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bars3Icon,
  BellIcon,
  Cog6ToothIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  UserIcon,
  CreditCardIcon,
  ArrowRightOnRectangleIcon,
  ArrowLeftOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { useAdmin } from "@/contexts/AdminContext";
import adminApi from "@/services/api";
import { showToast } from "@/utils/toast.jsx";

const ProfileImage = ({ src, name, className }) => {
  const [imageError, setImageError] = useState(false);

  if (imageError || !src) {
    return (
      <div
        className={`${className} bg-white/10 text-white flex items-center justify-center`}>
        {!name
          ? "A"
          : name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()}
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

const getNotificationIcon = (type) => {
  const icons = {
    user: UserIcon,
    payment: CreditCardIcon,
    alert: ExclamationCircleIcon,
    default: CheckCircleIcon,
  };
  const Icon = icons[type] || icons.default;
  return <Icon className="h-4 w-4" />;
};

export default function Navbar({ open, setOpen }) {
  const { admin, logout } = useAdmin();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [hasUnread, setHasUnread] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      setNotificationsLoading(true);
      const response = await adminApi.getNotifications();

      if (response.data && response.data.success) {
        setNotifications(response.data.data.notifications || []);
        setUnreadCount(response.data.data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Error fetching notifications");
    } finally {
      setNotificationsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  // Add effect for handling outside clicks
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
    }

    // Add event listener if notifications are shown
    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    // Clean up event listener
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotifications]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      const response = await adminApi.markNotificationAsRead(notificationId);
      if (response.data && response.data.success) {
        // Update the local state to mark this notification as read
        setNotifications(
          notifications.map((notif) =>
            notif._id === notificationId ? { ...notif, read: true } : notif
          )
        );
        // Decrease unread count
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error marking notification as read");
      showToast.error("Failed to mark notification as read");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await adminApi.markAllNotificationsAsRead();
      // Update the notifications state
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, read: true }))
      );
      showToast.success("All notifications marked as read");
    } catch (error) {
      console.error("Error marking all notifications as read");
      showToast.error("Failed to mark notifications as read");
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      // Mark notification as read
      await adminApi.markNotificationAsRead(notification._id);

      // Navigate based on notification type
      switch (notification.type) {
        case "user":
          navigate("/users/all", {
            state: {
              fromNotification: true,
              userId: notification.data?.userId,
            },
          });
          break;
        case "payment":
          navigate("/payments");
          break;
        case "subscription":
          navigate("/subscriptions");
          break;
        case "report":
          navigate("/reports");
          break;
        default:
          break;
      }

      // Refresh notifications
      fetchNotifications();
    } catch (error) {
      console.error("Error handling notification");
      showToast.error("Failed to process notification");
    }
  };

  const formatTime = (timestamp) => {
    const diff = Date.now() - new Date(timestamp);
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleClearOldNotifications = async () => {
    try {
      // Pass true to clear all notifications
      const response = await adminApi.clearOldNotifications(true);
      if (response.data && response.data.success) {
        // Clear all notifications from the state
        setNotifications([]);
        setUnreadCount(0);
        showToast.success(`Cleared ${response.data.count} notifications`);
      }
    } catch (error) {
      console.error("Error clearing notifications");
      showToast.error("Failed to clear notifications");
    }
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      const response = await adminApi.deleteNotification(notificationId);
      if (response.data && response.data.success) {
        // Remove the notification from the local state
        setNotifications(notifications.filter((n) => n._id !== notificationId));
        // Update unread count if needed
        const deletedNotification = notifications.find(
          (n) => n._id === notificationId
        );
        if (deletedNotification && !deletedNotification.read) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
        showToast.success("Notification deleted");
      }
    } catch (error) {
      console.error("Error deleting notification");
      showToast.error("Failed to delete notification");
    }
  };

  return (
    <nav className="relative z-10 mt-6 mx-6">
      {/* Background with gradient */}
      <div className="absolute inset-x-0 -top-3 h-20 bg-black rounded-xl -z-10 w-[98%] mx-auto shadow-lg" />

      <div className="relative px-4 py-2">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setOpen(!open)}
            className="rounded-lg p-2 px-4 text-white hover:bg-white/10 transition-colors"
            title={open ? "Collapse Sidebar" : "Expand Sidebar"}>
            <Bars3Icon
              className={`h-5 w-5 transition-transform duration-300 ${
                !open ? "rotate-90" : ""
              }`}
            />
          </button>

          <div className="flex items-center gap-4 px-4">
            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={toggleNotifications}
                className="rounded-lg p-2 text-white hover:bg-white/10 transition-colors relative">
                <BellIcon className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500" />
                )}
              </button>

              {/* Notification dropdown with diagonal stripes and border */}
              {showNotifications && (
                <div
                  className="absolute right-0 mt-2 w-80 origin-top-right rounded-xl bg-white shadow-lg border border-black focus:outline-none"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,0,0,0.01) 5px, rgba(0,0,0,0.01) 10px)",
                  }}>
                  <div className="py-1">
                    <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                      <h3 className="text-sm font-medium">Notifications</h3>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleClearOldNotifications()}
                          className="text-xs text-gray-500 hover:text-gray-700">
                          Clear Old
                        </button>
                        {notifications.length > 0 && (
                          <button
                            onClick={handleMarkAllAsRead}
                            className="text-xs text-gray-500 hover:text-gray-700">
                            Mark all as read
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                          No notifications
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification._id}
                            className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 ${
                              !notification.read ? "bg-blue-50" : ""
                            }`}
                            onClick={() =>
                              handleNotificationClick(notification)
                            }>
                            <div className="flex items-start">
                              <div className="mr-3 mt-1">
                                <UserIcon
                                  className={`h-5 w-5 ${
                                    !notification.read
                                      ? "text-blue-600"
                                      : "text-gray-400"
                                  }`}
                                />
                              </div>
                              <div className="flex-1">
                                <p
                                  className={`text-sm ${
                                    !notification.read
                                      ? "font-medium text-gray-900"
                                      : "text-gray-600"
                                  }`}>
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {formatTime(notification.createdAt)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Menu */}
            <Menu as="div" className="relative">
              {({ open }) => (
                <>
                  <Menu.Button className="flex items-center gap-2 rounded-lg p-2 text-white hover:bg-white/10 transition-colors">
                    <ProfileImage
                      src={admin?.image}
                      name={admin?.name}
                      className="h-8 w-8 rounded-lg object-cover"
                    />
                    <span className="text-sm font-medium">
                      {admin?.name || "Admin"}
                    </span>
                  </Menu.Button>

                  <Transition
                    show={open}
                    as={Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95">
                    <Menu.Items className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-black bg-white shadow-lg [background-image:repeating-linear-gradient(45deg,_transparent,_transparent_5px,_rgba(0,0,0,0.01)_5px,_rgba(0,0,0,0.01)_10px)]">
                      <div className="p-4 flex flex-col items-center">
                        <ProfileImage
                          src={admin?.image}
                          name={admin?.name}
                          className="h-20 w-20 rounded-xl mb-2"
                        />
                        <div className="text-center">
                          <div className="text-sm font-medium text-gray-900">
                            {admin?.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {admin?.email}
                          </div>
                        </div>
                      </div>
                      <div className="border-t border-gray-100">
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              to="/settings"
                              className={`flex items-center gap-3 px-3 py-2 text-sm text-gray-700 ${
                                active ? "bg-gray-50" : ""
                              }`}>
                              <Cog6ToothIcon className="h-5 w-5" />
                              Settings
                            </Link>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={handleLogout}
                              className={`flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 ${
                                active ? "bg-gray-50" : ""
                              }`}>
                              <ArrowLeftOnRectangleIcon className="h-5 w-5 text-gray-400" />
                              Logout
                            </button>
                          )}
                        </Menu.Item>
                      </div>
                    </Menu.Items>
                  </Transition>
                </>
              )}
            </Menu>
          </div>
        </div>
      </div>
    </nav>
  );
}
