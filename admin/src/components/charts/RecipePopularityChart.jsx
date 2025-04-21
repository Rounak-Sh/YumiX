import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import adminApi from "@/services/api";
import { showToast } from "@/utils/toast";

// Fallback data in case API fails
const fallbackData = [
  { name: "Mon", views: 35 },
  { name: "Tue", views: 20 },
  { name: "Wed", views: 12 },
  { name: "Thu", views: 18 },
  { name: "Fri", views: 32 },
  { name: "Sat", views: 12 },
  { name: "Sun", views: 32 },
];

export default function RecipePopularityChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("just now");

  // Fetch real data from the API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await adminApi.getRecipePopularityData();

        if (response && response.data && response.data.success) {
          const chartData = response.data.data || [];

          if (chartData.length > 0) {
            const hasViews = chartData.some((item) => Number(item.views) > 0);
            if (hasViews) {
              setData(chartData);
            } else {
              setData(fallbackData);
            }
          } else {
            setData(fallbackData);
          }

          if (response.data.lastUpdated) {
            formatLastUpdatedTime(response.data.lastUpdated);
          }
        } else {
          setData(fallbackData);
        }
      } catch (error) {
        showToast.error("Failed to load recipe views data");
        setData(fallbackData);
      } finally {
        setLoading(false);
      }
    };

    const formatLastUpdatedTime = (lastUpdatedTime) => {
      const updateTime = new Date(lastUpdatedTime);
      const now = new Date();
      const diffMinutes = Math.floor((now - updateTime) / (1000 * 60));

      if (diffMinutes < 1) {
        setLastUpdated("just now");
      } else if (diffMinutes < 60) {
        setLastUpdated(`${diffMinutes} min ago`);
      } else {
        const diffHours = Math.floor(diffMinutes / 60);
        setLastUpdated(`${diffHours} hour${diffHours > 1 ? "s" : ""} ago`);
      }
    };

    fetchData();
  }, []);

  // Function to determine the max value for the Y-axis
  const getYAxisDomain = () => {
    if (data.length === 0) return [0, 50];

    const maxValue = Math.max(...data.map((item) => item.views || 0));
    return [0, Math.max(maxValue + 5, 10)]; // Ensure minimum height even with low values
  };

  return (
    <div className="h-[280px] w-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Recipe Views</h3>
        <p className="text-sm text-gray-600 font-medium">Weekly Distribution</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[80%] w-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="80%">
          <BarChart
            data={data}
            margin={{
              top: 5,
              right: 10,
              left: 10,
              bottom: 5,
            }}>
            <defs>
              <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4ade80" stopOpacity={1} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0.8} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(0,0,0,0.1)"
              vertical={true}
              horizontal={true}
            />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#666", fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#666", fontSize: 12 }}
              domain={getYAxisDomain()}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                borderColor: "#ddd",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                color: "#333",
              }}
              cursor={{ fill: "rgba(0, 0, 0, 0.05)" }}
              formatter={(value) => [`${value} views`, "Views"]}
            />
            <Bar
              dataKey="views"
              fill="url(#colorViews)"
              barSize={20}
              radius={[4, 4, 0, 0]}
              name="Views"
            />
          </BarChart>
        </ResponsiveContainer>
      )}

      <div className="flex items-center text-xs text-gray-500 mt-2 truncate">
        <svg
          className="w-4 h-4 mr-1 flex-shrink-0 text-gray-400"
          fill="currentColor"
          viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
            clipRule="evenodd"
          />
        </svg>
        <span className="whitespace-nowrap">updated {lastUpdated}</span>
      </div>
    </div>
  );
}
