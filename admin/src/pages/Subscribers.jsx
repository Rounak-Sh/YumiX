import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import adminApi from "@/services/api";
import { showToast } from "@/utils/toast";
import Loader from "@/components/Loader";
import {
  UserIcon,
  CalendarIcon,
  CreditCardIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

export default function Subscribers() {
  const { theme } = useOutletContext();
  const [subscribers, setSubscribers] = useState([]);
  const [filteredSubscribers, setFilteredSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPlan, setFilterPlan] = useState("all");
  const [sortConfig, setSortConfig] = useState({
    key: "subscription.startDate",
    direction: "desc",
  });
  const [uniquePlans, setUniquePlans] = useState([]);

  useEffect(() => {
    loadSubscribers();
  }, []);

  useEffect(() => {
    if (subscribers.length > 0) {
      applyFiltersAndSort();
    }
  }, [subscribers, searchTerm, filterStatus, filterPlan, sortConfig]);

  // Extract unique plans from subscriber data
  useEffect(() => {
    if (subscribers.length > 0) {
      const plans = new Set();
      subscribers.forEach((sub) => {
        if (sub.subscription?.plan?.name) {
          plans.add(sub.subscription.plan.name);
        }
      });
      setUniquePlans(Array.from(plans));
    }
  }, [subscribers]);

  const loadSubscribers = async () => {
    try {
      const response = await adminApi.getSubscribedUsers();
      setSubscribers(response.data.data);
      setFilteredSubscribers(response.data.data);
    } catch (error) {
      console.error("Error loading subscribers:", error);
      showToast.error("Failed to load subscribers");
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let result = [...subscribers];

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (sub) =>
          sub.name.toLowerCase().includes(term) ||
          sub.email.toLowerCase().includes(term)
      );
    }

    // Apply status filter
    if (filterStatus !== "all") {
      result = result.filter((sub) => {
        const status = getSubscriptionStatus(sub.subscription);
        return filterStatus === "active"
          ? status === "Active"
          : status !== "Active";
      });
    }

    // Apply plan filter
    if (filterPlan !== "all") {
      result = result.filter(
        (sub) => sub.subscription?.plan?.name === filterPlan
      );
    }

    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        // Handle nested properties
        const keys = sortConfig.key.split(".");
        let valueA = a;
        let valueB = b;

        for (const key of keys) {
          valueA = valueA?.[key];
          valueB = valueB?.[key];
        }

        // Handle date comparison
        if (valueA instanceof Date || (valueA && !isNaN(new Date(valueA)))) {
          valueA = new Date(valueA).getTime();
          valueB = new Date(valueB).getTime();
        }

        if (valueA < valueB) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (valueA > valueB) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    setFilteredSubscribers(result);
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "-";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getSubscriptionStatus = (subscription) => {
    if (!subscription) return "No subscription";
    if (!subscription.endDate) return "No end date";

    const endDate = new Date(subscription.endDate);
    const now = new Date();

    if (endDate > now) {
      // Calculate days remaining
      const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
      return daysRemaining <= 7
        ? `Active (${daysRemaining} days left)`
        : "Active";
    } else {
      return "Expired";
    }
  };

  const calculateRenewalRate = () => {
    if (subscribers.length === 0) return "0%";

    const activeSubscribers = subscribers.filter((sub) =>
      getSubscriptionStatus(sub.subscription).includes("Active")
    ).length;

    return `${Math.round((activeSubscribers / subscribers.length) * 100)}%`;
  };

  if (loading) {
    return <Loader type="table" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className={`text-2xl font-bold ${theme.text}`}>Subscribers</h1>
          <p className={`mt-1 ${theme.textSecondary}`}>
            Manage your subscribed users
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`${theme.card} px-4 py-3 rounded-lg border ${theme.border}`}>
            <div className="text-xs text-gray-500">Total Subscribers</div>
            <div className="text-xl font-bold">{subscribers.length}</div>
          </div>

          <div
            className={`${theme.card} px-4 py-3 rounded-lg border ${theme.border}`}>
            <div className="text-xs text-gray-500">Active Rate</div>
            <div className="text-xl font-bold">{calculateRenewalRate()}</div>
          </div>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div
          className={`flex-1 min-w-[200px] ${theme.card} rounded-lg border ${theme.border} px-3 py-2 flex items-center`}>
          <MagnifyingGlassIcon className="h-5 w-5 mr-2 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
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
            <option value="active">Active Only</option>
            <option value="expired">Expired Only</option>
          </select>
        </div>

        {/* Plan Filter */}
        <div
          className={`${theme.card} rounded-lg border ${theme.border} px-3 py-2 flex items-center`}>
          <select
            value={filterPlan}
            onChange={(e) => setFilterPlan(e.target.value)}
            className={`bg-transparent border-none focus:outline-none pr-8 ${theme.text}`}>
            <option value="all">All Plans</option>
            {uniquePlans.map((plan) => (
              <option key={plan} value={plan}>
                {plan}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Header Container */}
      <div className="bg-black w-[95%] rounded-xl p-3 mb-2 ml-5 mx-2">
        <div className="flex">
          <div
            className="w-[20%] text-sm font-medium text-white pl-10 px-4 cursor-pointer flex items-center"
            onClick={() => handleSort("name")}>
            User
            {sortConfig.key === "name" && (
              <ArrowsUpDownIcon className="h-4 w-4 ml-1" />
            )}
          </div>
          <div
            className="w-[20%] text-sm font-medium text-white pl-12 px-4 cursor-pointer flex items-center"
            onClick={() => handleSort("subscription.plan.name")}>
            Plan
            {sortConfig.key === "subscription.plan.name" && (
              <ArrowsUpDownIcon className="h-4 w-4 ml-1" />
            )}
          </div>
          <div className="w-[15%] text-sm font-medium text-white pl-8 px-4">
            Status
          </div>
          <div
            className="w-[25%] text-sm font-medium text-white pl-14 px-4 cursor-pointer flex items-center"
            onClick={() => handleSort("subscription.endDate")}>
            Duration
            {sortConfig.key === "subscription.endDate" && (
              <ArrowsUpDownIcon className="h-4 w-4 ml-1" />
            )}
          </div>
          <div
            className="w-[20%] text-sm font-medium text-white pl-12 px-4 cursor-pointer flex items-center"
            onClick={() => handleSort("lastPayment.date")}>
            Last Payment
            {sortConfig.key === "lastPayment.date" && (
              <ArrowsUpDownIcon className="h-4 w-4 ml-1" />
            )}
          </div>
        </div>
      </div>

      <div className={`rounded-xl ${theme.card} border ${theme.border}`}>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full">
            <tbody>
              {filteredSubscribers.map((subscriber) => (
                <tr
                  key={subscriber._id}
                  className={`border-b ${theme.border} hover:bg-gray-50/5`}>
                  <td className={`p-4 w-[20%] ${theme.text}`}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                        {subscriber.name?.[0]?.toUpperCase() || "U"}
                      </div>
                      <div>
                        <div className={`font-medium ${theme.text}`}>
                          {subscriber.name}
                        </div>
                        <div className={`text-sm ${theme.textSecondary}`}>
                          {subscriber.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className={`p-4 w-[20%] ${theme.text}`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${theme.hover}`}>
                        <CreditCardIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className={`font-medium ${theme.text}`}>
                          {subscriber.subscription?.plan?.name || "No Plan"}
                        </div>
                        <div className={`text-sm ${theme.textSecondary}`}>
                          {formatCurrency(subscriber.subscription?.plan?.price)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className={`p-4 w-[15%]`}>
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        getSubscriptionStatus(subscriber.subscription).includes(
                          "Active"
                        )
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                      {getSubscriptionStatus(subscriber.subscription)}
                    </span>
                  </td>
                  <td className={`p-4 w-[25%]`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${theme.hover}`}>
                        <CalendarIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className={`text-sm ${theme.text}`}>
                          {formatDate(subscriber.subscription?.startDate)}
                        </div>
                        <div className={`text-sm ${theme.textSecondary}`}>
                          to {formatDate(subscriber.subscription?.endDate)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className={`p-4 w-[20%]`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${theme.hover}`}>
                        <CreditCardIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className={`font-medium ${theme.text}`}>
                          {formatCurrency(subscriber.lastPayment?.amount)}
                        </div>
                        <div className={`text-sm ${theme.textSecondary}`}>
                          {formatDate(subscriber.lastPayment?.date)}
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredSubscribers.length === 0 && (
        <div className={`text-center ${theme.textSecondary} py-12`}>
          {subscribers.length === 0
            ? "No subscribers found"
            : "No matching subscribers found"}
        </div>
      )}
    </div>
  );
}
