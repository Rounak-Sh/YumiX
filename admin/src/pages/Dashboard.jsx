import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import DashboardStats from "../components/DashboardStats";
import UserGrowthChart from "../components/charts/UserGrowthChart";
import RecipePopularityChart from "../components/charts/RecipePopularityChart";
import SubscriptionChart from "../components/charts/SubscriptionChart";
import ActivityMetricsChart from "../components/charts/ActivityMetricsChart";
import adminApi from "@/services/api";
import Loader from "@/components/Loader";
import { showToast } from "@/utils/toast";

export default function Dashboard() {
  const { theme } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeRecipes: 0,
    totalSubscriptions: 0,
    recipeViews: 0,
  });
  const [statsChanges, setStatsChanges] = useState({
    usersChange: 0,
    recipesChange: 0,
    subscriptionsChange: 0,
    viewsChange: 0,
  });

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        const response = await adminApi.getDashboardStats();

        if (response && response.data && response.data.success) {
          // Extract the stats from the response
          const stats = response.data.stats || {};

          // Use nullish coalescing to provide defaults when values are undefined/null
          const {
            totalUsers = 0,
            activeRecipes = 0,
            activeSubscriptions = 0,
            recipeViews = 0,
            usersChange = 0,
            recipesChange = 0,
            subscriptionsChange = 0,
            viewsChange = 0,
          } = stats;

          // Update state with the fetched data, ensuring all values are numbers
          setStats({
            totalUsers: Number(totalUsers) || 0,
            activeRecipes: Number(activeRecipes) || 0,
            totalSubscriptions: Number(activeSubscriptions) || 0,
            recipeViews: recipeViews === 0 ? 0 : Number(recipeViews) || 0,
          });

          // Update percentage changes with safely rounded values
          setStatsChanges({
            usersChange: parseFloat(usersChange?.toFixed(1)) || 0,
            recipesChange: parseFloat(recipesChange?.toFixed(1)) || 0,
            subscriptionsChange:
              parseFloat(subscriptionsChange?.toFixed(1)) || 0,
            viewsChange: parseFloat(viewsChange?.toFixed(1)) || 0,
          });
        } else {
          showToast.error("Failed to load dashboard data");
        }
      } catch (error) {
        showToast.error(
          "Failed to load dashboard data. Please try again later."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  if (loading) {
    return <Loader type="dashboard" />;
  }

  return (
    <div className="p-4 bg-gray-50 text-black">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Stats Cards */}
      <DashboardStats stats={stats} changes={statsChanges} loading={loading} />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
        {/* Chart Cards */}
        <div
          className={`p-4 rounded-xl shadow-sm ${theme.card} border ${theme.border}`}>
          <UserGrowthChart />
        </div>

        <div
          className={`p-4 rounded-xl shadow-sm ${theme.card} border ${theme.border}`}>
          <RecipePopularityChart />
        </div>

        <div
          className={`p-4 rounded-xl shadow-sm ${theme.card} border ${theme.border}`}>
          <SubscriptionChart />
        </div>

        <div
          className={`p-4 rounded-xl shadow-sm ${theme.card} border ${theme.border}`}>
          <ActivityMetricsChart />
        </div>
      </div>
    </div>
  );
}
