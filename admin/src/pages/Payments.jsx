import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import adminApi from "@/services/api";
import { showToast } from "@/utils/toast";
import Loader from "@/components/Loader";
import {
  BanknotesIcon,
  CalendarIcon,
  ArrowsUpDownIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";

export default function Payments() {
  const { theme } = useOutletContext();
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dateRange, setDateRange] = useState({
    start: "",
    end: "",
  });
  const [sortConfig, setSortConfig] = useState({
    key: "createdAt",
    direction: "desc",
  });
  const [stats, setStats] = useState({
    totalAmount: 0,
    totalCompleted: 0,
    totalPending: 0,
    totalFailed: 0,
  });

  useEffect(() => {
    loadPayments();
  }, []);

  useEffect(() => {
    if (payments.length > 0) {
      applyFiltersAndSort();
    }
  }, [payments, searchTerm, filterStatus, dateRange, sortConfig]);

  const loadPayments = async () => {
    try {
      const response = await adminApi.getPaymentHistory();
      setPayments(response.data.data);
      setFilteredPayments(response.data.data);
      calculateStats(response.data.data);
    } catch (error) {
      showToast.error("Failed to load payment history");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (paymentData) => {
    const stats = {
      totalAmount: 0,
      totalCompleted: 0,
      totalPending: 0,
      totalFailed: 0,
    };

    paymentData.forEach((payment) => {
      if (payment.status.toLowerCase() === "completed") {
        stats.totalAmount += payment.amount;
        stats.totalCompleted++;
      } else if (payment.status.toLowerCase() === "pending") {
        stats.totalPending++;
      } else if (payment.status.toLowerCase() === "failed") {
        stats.totalFailed++;
      }
    });

    setStats(stats);
  };

  const applyFiltersAndSort = () => {
    let result = [...payments];

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (payment) =>
          payment.user.name.toLowerCase().includes(term) ||
          payment.user.email.toLowerCase().includes(term) ||
          payment.transactionId.toLowerCase().includes(term)
      );
    }

    // Apply status filter
    if (filterStatus !== "all") {
      result = result.filter(
        (payment) => payment.status.toLowerCase() === filterStatus.toLowerCase()
      );
    }

    // Apply date range
    if (dateRange.start) {
      const startDate = new Date(dateRange.start);
      result = result.filter(
        (payment) => new Date(payment.createdAt) >= startDate
      );
    }

    if (dateRange.end) {
      const endDate = new Date(dateRange.end);
      // Set to end of the day
      endDate.setHours(23, 59, 59, 999);
      result = result.filter(
        (payment) => new Date(payment.createdAt) <= endDate
      );
    }

    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        // Handle special case for user.name (nested property)
        if (sortConfig.key === "user.name") {
          if (a.user.name < b.user.name) {
            return sortConfig.direction === "asc" ? -1 : 1;
          }
          if (a.user.name > b.user.name) {
            return sortConfig.direction === "asc" ? 1 : -1;
          }
          return 0;
        }

        // Handle dates
        if (sortConfig.key === "createdAt") {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return sortConfig.direction === "asc" ? dateA - dateB : dateB - dateA;
        }

        // Handle amounts
        if (sortConfig.key === "amount") {
          return sortConfig.direction === "asc"
            ? a.amount - b.amount
            : b.amount - a.amount;
        }

        // Default sorting for other fields
        const valueA = a[sortConfig.key];
        const valueB = b[sortConfig.key];
        if (valueA < valueB) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (valueA > valueB) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    setFilteredPayments(result);

    // Also update stats for filtered data
    calculateStats(result);
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const resetFilters = () => {
    setSearchTerm("");
    setFilterStatus("all");
    setDateRange({ start: "", end: "" });
  };

  const handleExportCSV = () => {
    try {
      // Create CSV content
      let csvContent = "Transaction ID,User,Email,Amount,Status,Date\n";

      filteredPayments.forEach((payment) => {
        const row = [
          payment.transactionId,
          payment.user.name,
          payment.user.email,
          payment.amount,
          payment.status,
          formatDate(payment.createdAt),
        ]
          .map((item) => `"${item}"`)
          .join(",");

        csvContent += row + "\n";
      });

      // Create download link
      const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `payment_history_${new Date().toISOString().split("T")[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast.success("Payment data exported successfully");
    } catch (error) {
      showToast.error("Failed to export payment data");
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-700";
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "failed":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (loading) {
    return <Loader type="table" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className={`text-2xl font-bold ${theme.text}`}>
            Payment History
          </h1>
          <p className={`mt-1 ${theme.textSecondary}`}>
            View all payment transactions
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-white hover:bg-black/90">
          <ArrowDownTrayIcon className="h-5 w-5" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`${theme.card} p-4 rounded-lg border ${theme.border}`}>
          <div className="text-sm text-gray-500">Total Revenue</div>
          <div className="text-2xl font-bold">
            {formatCurrency(stats.totalAmount)}
          </div>
        </div>

        <div className={`${theme.card} p-4 rounded-lg border ${theme.border}`}>
          <div className="text-sm text-gray-500">Completed Payments</div>
          <div className="text-2xl font-bold text-green-600">
            {stats.totalCompleted}
          </div>
        </div>

        <div className={`${theme.card} p-4 rounded-lg border ${theme.border}`}>
          <div className="text-sm text-gray-500">Pending Payments</div>
          <div className="text-2xl font-bold text-yellow-600">
            {stats.totalPending}
          </div>
        </div>

        <div className={`${theme.card} p-4 rounded-lg border ${theme.border}`}>
          <div className="text-sm text-gray-500">Failed Payments</div>
          <div className="text-2xl font-bold text-red-600">
            {stats.totalFailed}
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div
          className={`flex-1 min-w-[200px] ${theme.card} rounded-lg border ${theme.border} px-3 py-2 flex items-center`}>
          <MagnifyingGlassIcon className="h-5 w-5 mr-2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by user or transaction ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`bg-transparent border-none focus:outline-none w-full ${theme.text}`}
          />
        </div>

        {/* Status Filter */}
        <div
          className={`${theme.card} rounded-lg border ${theme.border} px-3 py-2 flex items-center`}>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={`bg-transparent border-none focus:outline-none pr-8 ${theme.text}`}>
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {/* Date Range - Start */}
        <div
          className={`${theme.card} rounded-lg border ${theme.border} px-3 py-2 flex items-center gap-2`}>
          <CalendarIcon className="h-5 w-5 text-gray-400" />
          <input
            type="date"
            placeholder="Start date"
            value={dateRange.start}
            onChange={(e) =>
              setDateRange({ ...dateRange, start: e.target.value })
            }
            className={`bg-transparent border-none focus:outline-none ${theme.text}`}
          />
        </div>

        {/* Date Range - End */}
        <div
          className={`${theme.card} rounded-lg border ${theme.border} px-3 py-2 flex items-center gap-2`}>
          <CalendarIcon className="h-5 w-5 text-gray-400" />
          <input
            type="date"
            placeholder="End date"
            value={dateRange.end}
            onChange={(e) =>
              setDateRange({ ...dateRange, end: e.target.value })
            }
            className={`bg-transparent border-none focus:outline-none ${theme.text}`}
          />
        </div>

        {/* Reset Filters */}
        <button
          onClick={resetFilters}
          className={`${theme.card} rounded-lg border ${theme.border} px-3 py-2 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800`}>
          <FunnelIcon className="h-5 w-5 text-gray-400" />
          <span>Reset</span>
        </button>
      </div>

      {/* Header Container */}
      <div className="bg-black w-[95%] rounded-xl p-3 mb-2 ml-5 mx-2">
        <div className="flex">
          <div
            className="w-[25%] text-sm font-medium text-white pl-10 px-4 cursor-pointer flex items-center"
            onClick={() => handleSort("transactionId")}>
            Transaction ID
            {sortConfig.key === "transactionId" && (
              <ArrowsUpDownIcon className="h-4 w-4 ml-1" />
            )}
          </div>
          <div
            className="w-[20%] text-sm font-medium text-white pl-12 px-4 cursor-pointer flex items-center"
            onClick={() => handleSort("user.name")}>
            User
            {sortConfig.key === "user.name" && (
              <ArrowsUpDownIcon className="h-4 w-4 ml-1" />
            )}
          </div>
          <div
            className="w-[15%] text-sm font-medium text-white pl-8 px-4 cursor-pointer flex items-center"
            onClick={() => handleSort("amount")}>
            Amount
            {sortConfig.key === "amount" && (
              <ArrowsUpDownIcon className="h-4 w-4 ml-1" />
            )}
          </div>
          <div
            className="w-[20%] text-sm font-medium text-white pl-12 px-4 cursor-pointer flex items-center"
            onClick={() => handleSort("status")}>
            Status
            {sortConfig.key === "status" && (
              <ArrowsUpDownIcon className="h-4 w-4 ml-1" />
            )}
          </div>
          <div
            className="w-[20%] text-sm font-medium text-white pl-12 px-4 cursor-pointer flex items-center"
            onClick={() => handleSort("createdAt")}>
            Date
            {sortConfig.key === "createdAt" && (
              <ArrowsUpDownIcon className="h-4 w-4 ml-1" />
            )}
          </div>
        </div>
      </div>

      <div className={`rounded-xl ${theme.card} border ${theme.border}`}>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full">
            <tbody>
              {filteredPayments.map((payment) => (
                <tr
                  key={payment._id}
                  className={`border-b ${theme.border} hover:bg-gray-50/5`}>
                  <td className={`p-4 w-[25%] ${theme.text}`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${theme.hover}`}>
                        <BanknotesIcon className="h-5 w-5" />
                      </div>
                      <span className={`font-medium ${theme.text}`}>
                        {payment.transactionId}
                      </span>
                    </div>
                  </td>
                  <td className={`p-4 w-[20%] ${theme.text}`}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                        {payment.user.name[0].toUpperCase()}
                      </div>
                      <div>
                        <div className={`font-medium ${theme.text}`}>
                          {payment.user.name}
                        </div>
                        <div className={`text-sm ${theme.textSecondary}`}>
                          {payment.user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className={`p-4 w-[15%] ${theme.text}`}>
                    {formatCurrency(payment.amount)}
                  </td>
                  <td className={`p-4 w-[20%]`}>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(
                        payment.status
                      )}`}>
                      {payment.status}
                    </span>
                  </td>
                  <td className={`p-4 w-[20%]`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${theme.hover}`}>
                        <CalendarIcon className="h-5 w-5" />
                      </div>
                      <span className={theme.textSecondary}>
                        {formatDate(payment.createdAt)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredPayments.length === 0 && (
        <div className={`text-center ${theme.textSecondary} py-12`}>
          {payments.length === 0
            ? "No payment history found"
            : "No matching payments found"}
        </div>
      )}

      {/* Pagination could be added here if needed */}
    </div>
  );
}
