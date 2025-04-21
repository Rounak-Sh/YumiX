import { useState, useEffect } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { ArrowLeftIcon, CreditCardIcon } from "@heroicons/react/24/outline";
import adminApi from "@/services/api";
import { showToast } from "@/utils/toast";
import Loader from "@/components/Loader";

export default function UserDetails() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { theme } = useOutletContext();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        setLoading(true);
        const response = await adminApi.getUserDetails(userId);
        setUser(response.data.data);
      } catch (error) {
        showToast.error("Failed to load user details");
        navigate("/users/all");
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, [userId, navigate]);

  const handleBlockUser = async () => {
    try {
      setActionLoading(true);
      await adminApi.blockUser(userId);
      showToast.success("User blocked successfully");
      setUser((prev) => ({ ...prev, status: "blocked" }));
    } catch (error) {
      showToast.error("Failed to block user");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnblockUser = async () => {
    try {
      setActionLoading(true);
      await adminApi.unblockUser(userId);
      showToast.success("User unblocked successfully");
      setUser((prev) => ({ ...prev, status: "active" }));
    } catch (error) {
      showToast.error("Failed to unblock user");
    } finally {
      setActionLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Format currency for display
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "N/A";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  if (loading) {
    return <Loader type="default" />;
  }

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className={`text-lg ${theme.text}`}>User not found</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 mt-14">
      {/* Header */}
      <div className="flex w-[80%] items-center justify-between bg-black rounded-xl mx-auto p-1 px-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-lg p-2 text-white hover:bg-white/10">
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-white">User Details</h1>
        </div>
        <button
          onClick={
            user.status === "blocked" ? handleUnblockUser : handleBlockUser
          }
          disabled={actionLoading}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium min-w-[100px] ${
            user.status === "blocked"
              ? "bg-green-100 text-green-700 hover:bg-green-200"
              : "bg-red-100 text-red-700 hover:bg-red-200"
          } disabled:opacity-50`}>
          {actionLoading ? (
            <div className="flex justify-center">
              <div className="w-5 h-5 border-2 border-current border-r-transparent rounded-full animate-spin"></div>
            </div>
          ) : user.status === "blocked" ? (
            "Unblock User"
          ) : (
            "Block User"
          )}
        </button>
      </div>

      {/* User Profile */}
      <div
        className={`w-[85%] mx-auto rounded-xl ${theme.card} border ${theme.border} p-6`}>
        <div className="flex items-center gap-6">
          {/* Profile Image */}
          <div className="h-24 w-24 overflow-hidden rounded-xl">
            {user.profilePicture ? (
              <img
                src={user.profilePicture}
                alt={user.name}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "flex";
                }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-black text-white text-2xl font-bold">
                {user.name[0].toUpperCase()}
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="flex-1">
            <h2 className={`text-xl font-bold ${theme.text}`}>{user.name}</h2>
            <p className={`${theme.textSecondary}`}>{user.email}</p>
            {user.phone && (
              <p className={`${theme.textSecondary}`}>{user.phone}</p>
            )}
            <div className="mt-2 flex items-center gap-4">
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${
                  user.status === "active"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}>
                {user.status}
              </span>
              <span className={`text-sm ${theme.textSecondary}`}>
                Joined: {formatDate(user.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Additional User Stats */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 border-t pt-4">
          <div>
            <p className={`text-sm font-medium ${theme.textSecondary}`}>
              Daily Searches
            </p>
            <p className={`text-base ${theme.text}`}>
              {user.dailySearchCount || 0}
            </p>
          </div>
          <div>
            <p className={`text-sm font-medium ${theme.textSecondary}`}>
              Last Search
            </p>
            <p className={`text-base ${theme.text}`}>
              {formatDate(user.lastSearchDate)}
            </p>
          </div>
          <div>
            <p className={`text-sm font-medium ${theme.textSecondary}`}>
              Favorites
            </p>
            <p className={`text-base ${theme.text}`}>
              {user.favorites?.length || 0} recipes
            </p>
          </div>
        </div>
      </div>

      {/* Subscription Info */}
      <div
        className={`w-[85%] mx-auto rounded-xl ${theme.card} border ${theme.border} p-6`}>
        <h3 className={`text-lg font-semibold mb-4 ${theme.text}`}>
          Subscription
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className={`text-sm font-medium ${theme.textSecondary}`}>Plan</p>
            <p className={`text-base ${theme.text}`}>
              {user.subscription?.planType ||
                (user.isSubscribed ? "Active Plan" : "Free")}
            </p>
          </div>
          <div>
            <p className={`text-sm font-medium ${theme.textSecondary}`}>
              Status
            </p>
            <p className={`text-base ${theme.text}`}>
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                  user.subscription?.isActive
                    ? "bg-green-100 text-green-700"
                    : user.isSubscribed
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100 text-gray-700"
                }`}>
                {user.subscription?.isActive
                  ? "Active"
                  : user.isSubscribed
                  ? "Inactive"
                  : "Not Subscribed"}
              </span>
            </p>
          </div>
          <div>
            <p className={`text-sm font-medium ${theme.textSecondary}`}>
              Start Date
            </p>
            <p className={`text-base ${theme.text}`}>
              {formatDate(user.subscription?.startDate)}
            </p>
          </div>
          <div>
            <p className={`text-sm font-medium ${theme.textSecondary}`}>
              Expiry Date
            </p>
            <p className={`text-base ${theme.text}`}>
              {formatDate(user.subscription?.expiryDate)}
            </p>
          </div>
          <div>
            <p className={`text-sm font-medium ${theme.textSecondary}`}>
              Subscription ID
            </p>
            <p className={`text-base font-mono ${theme.text}`}>
              {user.subscriptionId || "N/A"}
            </p>
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div
        className={`w-[85%] mx-auto rounded-xl ${theme.card} border ${theme.border} p-6`}>
        <h3 className={`text-lg font-semibold mb-4 ${theme.text}`}>
          Payment History
        </h3>
        {user.payments && user.payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300">
              <thead>
                <tr>
                  <th
                    className={`px-4 py-2 text-left text-xs font-medium ${theme.textSecondary} uppercase tracking-wider`}>
                    Transaction ID
                  </th>
                  <th
                    className={`px-4 py-2 text-left text-xs font-medium ${theme.textSecondary} uppercase tracking-wider`}>
                    Amount
                  </th>
                  <th
                    className={`px-4 py-2 text-left text-xs font-medium ${theme.textSecondary} uppercase tracking-wider`}>
                    Status
                  </th>
                  <th
                    className={`px-4 py-2 text-left text-xs font-medium ${theme.textSecondary} uppercase tracking-wider`}>
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {user.payments.map((payment) => (
                  <tr key={payment._id} className="hover:bg-gray-50/10">
                    <td className={`px-4 py-2 text-sm font-mono ${theme.text}`}>
                      {payment.transactionId || payment._id}
                    </td>
                    <td className={`px-4 py-2 text-sm ${theme.text}`}>
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className={`px-4 py-2 text-sm`}>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          payment.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : payment.status === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className={`px-4 py-2 text-sm ${theme.textSecondary}`}>
                      {formatDate(payment.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            className={`flex items-center justify-center py-8 ${theme.textSecondary}`}>
            <CreditCardIcon className="h-5 w-5 mr-2" />
            <p>No payment history found</p>
          </div>
        )}
      </div>
    </div>
  );
}
