import {
  UserIcon,
  DocumentTextIcon,
  CreditCardIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { useOutletContext } from "react-router-dom";

// Individual stat card component
const StatCard = ({ title, value, icon: Icon, change, loading }) => {
  const { theme } = useOutletContext();
  const isPositive = change > 0;
  const isNeutral = change === 0;

  // Ensure value is treated as a number, but preserve explicit zero values
  const displayValue = value === 0 ? 0 : Number(value) || 0;

  return (
    <div
      className={`p-6 rounded-xl shadow-sm ${theme.card} border ${theme.border}`}>
      <div className="flex justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          {loading ? (
            <div className="h-8 w-24 bg-gray-300 animate-pulse rounded mt-2"></div>
          ) : (
            <h3 className="text-2xl font-bold mt-1 text-gray-800">
              {displayValue.toLocaleString()}
            </h3>
          )}
        </div>
        <div className="h-12 w-12 rounded-full flex items-center justify-center bg-gray-100">
          <Icon className="h-6 w-6 text-gray-600" />
        </div>
      </div>

      {!loading && (
        <div className="mt-4 flex items-center">
          <span
            className={`text-sm font-medium ${
              isNeutral
                ? "text-gray-500"
                : isPositive
                ? "text-green-500"
                : "text-red-500"
            }`}>
            {isPositive ? "+" : ""}
            {change.toFixed(1)}%
          </span>
          <span className="text-xs text-gray-500 ml-2">since last month</span>
        </div>
      )}
    </div>
  );
};

export default function DashboardStats({ stats, changes, loading }) {
  // Ensure all stats values are numbers and have defaults, preserving explicit zeros
  const safeStats = {
    totalUsers: stats?.totalUsers === 0 ? 0 : Number(stats?.totalUsers) || 0,
    activeRecipes:
      stats?.activeRecipes === 0 ? 0 : Number(stats?.activeRecipes) || 0,
    totalSubscriptions:
      stats?.totalSubscriptions === 0
        ? 0
        : Number(stats?.totalSubscriptions) || 0,
    recipeViews: stats?.recipeViews === 0 ? 0 : Number(stats?.recipeViews) || 0,
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Total Users"
        value={safeStats.totalUsers}
        icon={UserIcon}
        change={changes?.usersChange ?? 0}
        loading={loading}
      />
      <StatCard
        title="Active Recipes"
        value={safeStats.activeRecipes}
        icon={DocumentTextIcon}
        change={changes?.recipesChange ?? 0}
        loading={loading}
      />
      <StatCard
        title="Subscriptions"
        value={safeStats.totalSubscriptions}
        icon={CreditCardIcon}
        change={changes?.subscriptionsChange ?? 0}
        loading={loading}
      />
      <StatCard
        title="Recipes Viewed Today"
        value={safeStats.recipeViews}
        icon={MagnifyingGlassIcon}
        change={changes?.viewsChange ?? 0}
        loading={loading}
      />
    </div>
  );
}
