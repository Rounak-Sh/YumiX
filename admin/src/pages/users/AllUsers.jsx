import { useState, useEffect } from "react";
import { useOutletContext, useNavigate, useLocation } from "react-router-dom";
import adminApi from "@/services/api";
import { showToast } from "@/utils/toast";
import Loader from "@/components/Loader";

export default function AllUsers() {
  const { theme } = useOutletContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [highlightedUserId, setHighlightedUserId] = useState(null);
  const [blockingUserId, setBlockingUserId] = useState(null);

  useEffect(() => {
    fetchUsers();

    // Get highlighted user ID from location state
    if (location.state?.fromNotification) {
      setHighlightedUserId(location.state.userId);
      // Remove highlight after 2 seconds
      setTimeout(() => {
        setHighlightedUserId(null);
      }, 2000);
    }
  }, [location]);

  const fetchUsers = async () => {
    try {
      const response = await adminApi.getAllUsers();
      // Filter out blocked users
      const activeUsers = response.data.data.filter(
        (user) => user.status !== "blocked"
      );
      setUsers(activeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      showToast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const handleBlockUser = async (userId) => {
    setBlockingUserId(userId);
    try {
      await adminApi.blockUser(userId);
      showToast.success("User blocked successfully");
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error("Error blocking user:", error);
      showToast.error("Failed to block user");
    } finally {
      setBlockingUserId(null);
    }
  };

  const handleRowClick = (userId) => {
    navigate(`/users/details/${userId}`);
  };

  if (loading) {
    return <Loader type="table" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${theme.text}`}>All Users</h1>
        <p className={`mt-1 ${theme.textSecondary}`}>
          Manage active users in the system
        </p>
      </div>

      {/* Header Container */}
      <div className="bg-black w-[95%] rounded-xl p-3 mb-2 ml-5 mx-2">
        <div className="flex">
          <div className="w-[20%] text-sm font-medium text-white pl-10 px-4">
            Name
          </div>
          <div className="w-[30%] text-sm font-medium text-white pl-20 px-4">
            Email
          </div>
          <div className="w-[15%] text-sm font-medium text-white pl-7 px-4">
            Status
          </div>
          <div className="w-[20%] text-sm font-medium text-white pl-12 px-4">
            Joined
          </div>
          <div className="w-[15%] text-sm font-medium text-white pl-14 px-4">
            Actions
          </div>
        </div>
      </div>

      <div className={`rounded-xl ${theme.card} border ${theme.border}`}>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full">
            <tbody>
              {users.map((user) => (
                <tr
                  key={user._id}
                  onClick={() => handleRowClick(user._id)}
                  className={`border-b ${
                    theme.border
                  } hover:bg-gray-50/5 cursor-pointer transition-all duration-300
                    ${
                      highlightedUserId === user._id
                        ? "bg-blue-50/10 animate-highlight"
                        : ""
                    }`}>
                  <td className={`p-4 w-[20%] ${theme.text}`}>
                    <div className="flex items-center gap-3">
                      {user.profilePicture ? (
                        <img
                          src={user.profilePicture}
                          alt={user.name}
                          className="h-8 w-8 rounded-lg object-cover"
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.nextSibling.style.display = "flex";
                          }}
                        />
                      ) : null}
                      <div
                        className={`${
                          !user.profilePicture ? "flex" : "hidden"
                        } h-8 w-8 items-center justify-center rounded-lg bg-black text-white text-sm font-medium`}>
                        {user.name[0].toUpperCase()}
                      </div>
                      <span>{user.name}</span>
                    </div>
                  </td>
                  <td className={`p-4 w-[30%] ${theme.textSecondary}`}>
                    {user.email}
                  </td>
                  <td className={`p-4 w-[15%]`}>
                    <span
                      className={`rounded-full px-2 py-1 text-xs bg-green-100 text-green-700`}>
                      active
                    </span>
                  </td>
                  <td className={`p-4 w-[20%] ${theme.textSecondary}`}>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4 w-[15%]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent row click when clicking the button
                        handleBlockUser(user._id);
                      }}
                      disabled={blockingUserId === user._id}
                      className="rounded px-3 py-1 text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 min-w-[70px]">
                      {blockingUserId === user._id ? (
                        <div className="flex justify-center">
                          <div className="w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : (
                        "Block"
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {users.length === 0 && (
        <div className={`text-center ${theme.textSecondary} py-12`}>
          No active users found
        </div>
      )}
    </div>
  );
}
