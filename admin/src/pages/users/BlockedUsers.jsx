import { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import adminApi from "@/services/api";
import { showToast } from "@/utils/toast";
import Loader from "@/components/Loader";

export default function BlockedUsers() {
  const { theme } = useOutletContext();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unblockingUserId, setUnblockingUserId] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await adminApi.getAllUsers();
      // Filter only blocked users
      const blockedUsers = response.data.data.filter(
        (user) => user.status === "blocked"
      );
      setUsers(blockedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      showToast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const handleUnblockUser = async (userId) => {
    setUnblockingUserId(userId);
    try {
      await adminApi.unblockUser(userId);
      showToast.success("User unblocked successfully");
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error("Error unblocking user:", error);
      showToast.error("Failed to unblock user");
    } finally {
      setUnblockingUserId(null);
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
        <h1 className={`text-2xl font-bold ${theme.text}`}>Blocked Users</h1>
        <p className={`mt-1 ${theme.textSecondary}`}>
          Manage blocked users in the system
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
          <div className="w-[15%] text-sm font-medium text-white pl-8 px-4">
            Status
          </div>
          <div className="w-[20%] text-sm font-medium text-white pl-8 px-4">
            Blocked Date
          </div>
          <div className="w-[15%] text-sm font-medium text-white pl-16 px-4">
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
                  className={`border-b ${theme.border} hover:bg-gray-50/5 cursor-pointer`}>
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
                      className={`rounded-full px-2 py-1 text-xs bg-red-100 text-red-700`}>
                      blocked
                    </span>
                  </td>
                  <td className={`p-4 w-[20%] ${theme.textSecondary}`}>
                    {new Date(user.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="p-4 w-[15%]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent row click when clicking the button
                        handleUnblockUser(user._id);
                      }}
                      disabled={unblockingUserId === user._id}
                      className="rounded px-3 py-1 text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50 min-w-[80px]">
                      {unblockingUserId === user._id ? (
                        <div className="flex justify-center">
                          <div className="w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : (
                        "Unblock"
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
          No blocked users found
        </div>
      )}
    </div>
  );
}
