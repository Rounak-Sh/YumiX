import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import adminApi from "@/services/api";
import { showToast } from "@/utils/toast";
import {
  UsersIcon,
  DocumentTextIcon,
  CreditCardIcon,
  BanknotesIcon,
  ArrowDownTrayIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";

export default function Reports() {
  const { theme } = useOutletContext();
  const [loading, setLoading] = useState({});

  // Filter dialogs state
  const [openDialog, setOpenDialog] = useState(null);

  // Filter options state
  const [userFilters, setUserFilters] = useState({
    startDate: "",
    endDate: "",
    status: "",
  });

  const [recipeFilters, setRecipeFilters] = useState({
    startDate: "",
    endDate: "",
    featured: "",
  });

  const [subscriptionFilters, setSubscriptionFilters] = useState({
    startDate: "",
    endDate: "",
    planType: "",
    status: "",
  });

  const [paymentFilters, setPaymentFilters] = useState({
    startDate: "",
    endDate: "",
    status: "",
  });

  // Recipe categories for dropdown
  const recipeCategories = [
    "All Categories",
    "Breakfast",
    "Lunch",
    "Dinner",
    "Dessert",
    "Appetizer",
    "Snack",
    "Beverage",
    "Vegetarian",
    "Vegan",
    "Gluten-Free",
    "Keto",
    "Low-Carb",
    "Main Course",
    "Pasta",
    "Pizza",
    "Sandwich",
    "Seafood",
    "Meat",
    "Baking",
    "Soup",
    "Salad",
  ];

  // Plan types for dropdown - updated to match what's in the database
  const planTypes = ["Basic Plan", "Premium Plan", "Pro Plan", "Free Trial"];

  // Payment statuses for dropdown - ensure consistency with backend
  const paymentStatuses = ["pending", "completed", "failed"];

  // Replace recipe categories dropdown with featured status options
  const featuredOptions = [
    { value: "", label: "All Recipes" },
    { value: "popular", label: "Popular Recipes" },
    { value: "featured", label: "Featured Recipes" },
    { value: "non-featured", label: "Non-Featured Recipes" },
    { value: "new", label: "Recently Added" },
  ];

  const reports = [
    {
      id: "users",
      title: "Users Report",
      description:
        "Comprehensive analytics on user demographics and engagement metrics",
      icon: UsersIcon,
      bgColor: "bg-blue-500/10",
      iconColor: "text-blue-500",
      time: "~30 seconds",
      metrics: [
        "Subscription and verification rates",
        "Active vs. blocked user breakdown",
        "Authentication method distribution",
        "User growth and registration trends",
      ],
    },
    {
      id: "recipes",
      title: "Recipes Report",
      description: "Download recipe usage and popularity data",
      icon: DocumentTextIcon,
      bgColor: "bg-green-500/10",
      iconColor: "text-green-500",
      time: "~45 seconds",
      metrics: [
        "Most popular recipes and categories",
        "Recipe search patterns",
        "User ratings and feedback analysis",
      ],
    },
    {
      id: "subscriptions",
      title: "Subscriptions Report",
      description: "Download subscription plan performance data",
      icon: CreditCardIcon,
      bgColor: "bg-purple-500/10",
      iconColor: "text-purple-500",
      time: "~20 seconds",
      metrics: [
        "Subscription plan distribution",
        "Renewal rates and churn analysis",
        "Revenue per subscription tier",
      ],
    },
    {
      id: "payments",
      title: "Payments Report",
      description: "Analyze payment transactions and revenue metrics",
      icon: BanknotesIcon,
      bgColor: "bg-yellow-500/10",
      iconColor: "text-yellow-500",
      time: "~40 seconds",
      metrics: [
        "Monthly and quarterly revenue trends",
        "Payment method distribution",
        "Revenue forecasting and projections",
      ],
    },
  ];

  const handleCloseDialog = () => {
    setOpenDialog(null);
  };

  const downloadReport = async (type) => {
    // For filter-enabled reports, show the dialog instead of directly downloading
    if (
      type === "users" ||
      type === "recipes" ||
      type === "subscriptions" ||
      type === "payments"
    ) {
      setOpenDialog(type);
      return;
    }

    if (loading[type]) return;

    try {
      setLoading((prev) => ({ ...prev, [type]: true }));
      const response = await adminApi.generateReport(type);

      // Create a blob from the response data
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      // Create a temporary link and trigger download
      const link = document.createElement("a");
      link.href = url;
      link.download = `${type}-report.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast.success(`${type} report downloaded successfully`);
    } catch (error) {
      showToast.error(`Failed to download ${type} report`);
    } finally {
      setLoading((prev) => ({ ...prev, [type]: false }));
    }
  };

  const handleGenerateReport = async (reportType) => {
    setLoading((prev) => ({ ...prev, [reportType]: true }));
    setOpenDialog(null);

    try {
      let params = {};

      // Add parameters based on report type
      switch (reportType) {
        case "users":
          if (userFilters.startDate) params.startDate = userFilters.startDate;
          if (userFilters.endDate) params.endDate = userFilters.endDate;
          if (userFilters.status) params.status = userFilters.status;
          break;
        case "recipes":
          if (recipeFilters.startDate)
            params.startDate = recipeFilters.startDate;
          if (recipeFilters.endDate) params.endDate = recipeFilters.endDate;
          // Replace category with featured filter
          if (recipeFilters.featured) params.featured = recipeFilters.featured;
          break;
        case "subscriptions":
          if (subscriptionFilters.startDate)
            params.startDate = subscriptionFilters.startDate;
          if (subscriptionFilters.endDate)
            params.endDate = subscriptionFilters.endDate;
          if (subscriptionFilters.planType)
            params.planType = subscriptionFilters.planType;
          if (subscriptionFilters.status)
            params.status = subscriptionFilters.status;
          break;
        case "payments":
          if (paymentFilters.startDate)
            params.startDate = paymentFilters.startDate;
          if (paymentFilters.endDate) params.endDate = paymentFilters.endDate;
          if (paymentFilters.status) params.status = paymentFilters.status;
          break;
        default:
          break;
      }

      // Use the enhanced adminApi.generateReport with the params object
      const response = await adminApi.generateReport(reportType, params);

      // Create a blob URL and trigger download
      const blob = new Blob([response.data], { type: "application/pdf" });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${reportType}-report.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast.success(
        `${
          reportType.charAt(0).toUpperCase() + reportType.slice(1)
        } report downloaded successfully`
      );
    } catch (error) {
      showToast.error(`Failed to download ${reportType} report`);
    } finally {
      setLoading((prev) => ({ ...prev, [reportType]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${theme.text}`}>Reports</h1>
        <p className={`mt-1 ${theme.textSecondary}`}>
          Generate and download detailed reports
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report) => (
          <div
            key={report.id}
            className={`rounded-xl ${theme.card} border ${theme.border} p-6 hover:shadow-md transition-shadow`}>
            <div className="flex items-start gap-4">
              <div
                className={`p-3 rounded-lg ${report.bgColor} ${report.iconColor}`}>
                <report.icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className={`text-lg font-semibold ${theme.text}`}>
                  {report.title}
                </h3>
                <p className={`mt-1 text-sm ${theme.textSecondary}`}>
                  {report.description}
                </p>

                <div className="mt-4 space-y-2">
                  {report.metrics.map((metric, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-gray-400"></div>
                      <span className={`text-xs ${theme.textSecondary}`}>
                        {metric}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ClockIcon className="h-4 w-4 text-gray-400" />
                    <span className={`text-xs ${theme.textSecondary}`}>
                      {report.time}
                    </span>
                  </div>
                  <button
                    onClick={() => downloadReport(report.id)}
                    disabled={loading[report.id]}
                    className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium ${
                      loading[report.id]
                        ? "bg-gray-100 text-gray-500"
                        : "bg-black text-white hover:bg-black/90"
                    }`}>
                    {loading[report.id] ? (
                      "Downloading..."
                    ) : (
                      <>
                        <ArrowDownTrayIcon className="h-4 w-4" />
                        Download
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* User Report Filter Dialog */}
      <Dialog
        open={openDialog === "users"}
        onClose={handleCloseDialog}
        className="rounded-lg">
        <DialogTitle className="text-lg font-semibold">
          User Report Filters
        </DialogTitle>
        <DialogContent className="pt-4 min-w-[400px]">
          <p className="text-sm text-gray-500 mb-4">
            Filter user report by status and date range (optional)
          </p>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="user-status"
                className="block text-sm font-medium text-gray-700 mb-1">
                User Status
              </label>
              <select
                id="user-status"
                className="border rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={userFilters.status}
                onChange={(e) =>
                  setUserFilters({ ...userFilters, status: e.target.value })
                }>
                <option value="">All Users</option>
                <option value="active">Active Users</option>
                <option value="blocked">Blocked Users</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="start-date"
                className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                id="start-date"
                className="border rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={userFilters.startDate}
                onChange={(e) =>
                  setUserFilters({ ...userFilters, startDate: e.target.value })
                }
              />
            </div>

            <div>
              <label
                htmlFor="end-date"
                className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                id="end-date"
                className="border rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={userFilters.endDate}
                onChange={(e) =>
                  setUserFilters({ ...userFilters, endDate: e.target.value })
                }
              />
            </div>
          </div>
        </DialogContent>
        <DialogActions className="px-6 py-3">
          <button
            onClick={() =>
              setUserFilters({ startDate: "", endDate: "", status: "" })
            }
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500">
            Reset Filters
          </button>
          <button
            onClick={handleCloseDialog}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500">
            Cancel
          </button>
          <button
            onClick={() => handleGenerateReport("users")}
            className="px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-black/90">
            Generate Report
          </button>
        </DialogActions>
      </Dialog>

      {/* Recipe Report Filter Dialog */}
      <Dialog
        open={openDialog === "recipes"}
        onClose={handleCloseDialog}
        className="rounded-lg">
        <DialogTitle className="text-lg font-semibold">
          Recipe Report Filters
        </DialogTitle>
        <DialogContent className="pt-4 min-w-[400px]">
          <p className="text-sm text-gray-500 mb-4">
            Filter recipe report by status and date range (optional)
          </p>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="recipe-featured"
                className="block text-sm font-medium text-gray-700 mb-1">
                Recipe Status
              </label>
              <select
                id="recipe-featured"
                className="border rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={recipeFilters.featured}
                onChange={(e) =>
                  setRecipeFilters({
                    ...recipeFilters,
                    featured: e.target.value,
                  })
                }>
                {featuredOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="recipe-start-date"
                  className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  id="recipe-start-date"
                  className="border rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={recipeFilters.startDate}
                  onChange={(e) =>
                    setRecipeFilters({
                      ...recipeFilters,
                      startDate: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label
                  htmlFor="recipe-end-date"
                  className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  id="recipe-end-date"
                  className="border rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={recipeFilters.endDate}
                  min={recipeFilters.startDate || ""}
                  onChange={(e) =>
                    setRecipeFilters({
                      ...recipeFilters,
                      endDate: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </div>
        </DialogContent>
        <DialogActions className="p-4 flex gap-2 justify-end">
          <button
            onClick={() =>
              setRecipeFilters({
                startDate: "",
                endDate: "",
                featured: "",
              })
            }
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500">
            Reset Filters
          </button>
          <button
            onClick={handleCloseDialog}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500">
            Cancel
          </button>
          <button
            onClick={() => handleGenerateReport("recipes")}
            className="px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-black/90">
            Generate Report
          </button>
        </DialogActions>
      </Dialog>

      {/* Subscription Report Filter Dialog */}
      <Dialog
        open={openDialog === "subscriptions"}
        onClose={handleCloseDialog}
        className="rounded-lg">
        <DialogTitle className="text-lg font-semibold">
          Subscription Report Filters
        </DialogTitle>
        <DialogContent className="pt-4 min-w-[400px]">
          <p className="text-sm text-gray-500 mb-4">
            Filter subscription report by plan type and date range (optional)
          </p>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="plan-type"
                className="block text-sm font-medium text-gray-700 mb-1">
                Plan Type
              </label>
              <select
                id="plan-type"
                className="border rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={subscriptionFilters.planType}
                onChange={(e) =>
                  setSubscriptionFilters({
                    ...subscriptionFilters,
                    planType: e.target.value,
                  })
                }>
                <option value="">All Plans</option>
                {planTypes.map((plan) => (
                  <option key={plan} value={plan}>
                    {plan}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="sub-status"
                className="block text-sm font-medium text-gray-700 mb-1">
                Subscription Status
              </label>
              <select
                id="sub-status"
                className="border rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={subscriptionFilters.status}
                onChange={(e) =>
                  setSubscriptionFilters({
                    ...subscriptionFilters,
                    status: e.target.value,
                  })
                }>
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="sub-start-date"
                className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                id="sub-start-date"
                className="border rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={subscriptionFilters.startDate}
                onChange={(e) =>
                  setSubscriptionFilters({
                    ...subscriptionFilters,
                    startDate: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <label
                htmlFor="sub-end-date"
                className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                id="sub-end-date"
                className="border rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={subscriptionFilters.endDate}
                onChange={(e) =>
                  setSubscriptionFilters({
                    ...subscriptionFilters,
                    endDate: e.target.value,
                  })
                }
              />
            </div>
          </div>
        </DialogContent>
        <DialogActions className="px-6 py-3">
          <button
            onClick={() =>
              setSubscriptionFilters({
                startDate: "",
                endDate: "",
                planType: "",
                status: "",
              })
            }
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500">
            Reset Filters
          </button>
          <button
            onClick={handleCloseDialog}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500">
            Cancel
          </button>
          <button
            onClick={() => handleGenerateReport("subscriptions")}
            className="px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-black/90">
            Generate Report
          </button>
        </DialogActions>
      </Dialog>

      {/* Payment Report Filter Dialog */}
      <Dialog
        open={openDialog === "payments"}
        onClose={handleCloseDialog}
        className="rounded-lg">
        <DialogTitle className="text-lg font-semibold">
          Payment Report Filters
        </DialogTitle>
        <DialogContent className="pt-4 min-w-[400px]">
          <p className="text-sm text-gray-500 mb-4">
            Filter payment report by status and date range (optional)
          </p>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="payment-status"
                className="block text-sm font-medium text-gray-700 mb-1">
                Payment Status
              </label>
              <select
                id="payment-status"
                className="border rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={paymentFilters.status}
                onChange={(e) =>
                  setPaymentFilters({
                    ...paymentFilters,
                    status: e.target.value,
                  })
                }>
                <option value="">All Statuses</option>
                {paymentStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="payment-start-date"
                className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                id="payment-start-date"
                className="border rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={paymentFilters.startDate}
                onChange={(e) =>
                  setPaymentFilters({
                    ...paymentFilters,
                    startDate: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <label
                htmlFor="payment-end-date"
                className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                id="payment-end-date"
                className="border rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={paymentFilters.endDate}
                onChange={(e) =>
                  setPaymentFilters({
                    ...paymentFilters,
                    endDate: e.target.value,
                  })
                }
              />
            </div>
          </div>
        </DialogContent>
        <DialogActions className="px-6 py-3">
          <button
            onClick={() =>
              setPaymentFilters({
                startDate: "",
                endDate: "",
                status: "",
              })
            }
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500">
            Reset Filters
          </button>
          <button
            onClick={handleCloseDialog}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500">
            Cancel
          </button>
          <button
            onClick={() => handleGenerateReport("payments")}
            className="px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-black/90">
            Generate Report
          </button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
