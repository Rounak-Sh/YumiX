import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import adminApi from "@/services/api";
import { showToast } from "@/utils/toast";

// Fallback data in case API fails
const fallbackData = [
  { name: "Free", value: 40, color: "#94a3b8" },
  { name: "Basic", value: 30, color: "#3b82f6" },
  { name: "Premium", value: 20, color: "#FFCF50" },
  { name: "Pro", value: 10, color: "#22c55e" },
];

// Color palette for different subscription plans
// We define more colors than needed to handle any number of plans
const colorPalette = {
  free: "#94a3b8", // Gray
  basic: "#3b82f6", // Blue
  standard: "#6366f1", // Indigo
  premium: "#FFCF50", // Yellow/Gold
  pro: "#22c55e", // Green
  advanced: "#ec4899", // Pink
  enterprise: "#8b5cf6", // Purple
  ultimate: "#f97316", // Orange
  // Fallback colors for any other plan types
  default1: "#14b8a6", // Teal
  default2: "#ef4444", // Red
  default3: "#84cc16", // Lime
};

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  index,
}) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function SubscriptionChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("just now");

  // Fetch real data from the API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await adminApi.getSubscriptionData();

        if (response && response.data && response.data.success) {
          // Transform the data for the chart
          const apiData = response.data.data || {};

          // Check if we have valid data with at least one subscription
          const hasData = Object.values(apiData).some(
            (value) => Number(value) > 0
          );

          if (hasData) {
            // Get a list of colors for the available plan types
            const usedColors = new Set();
            const getColorForPlan = (planType) => {
              const normalizedType = planType.toLowerCase();
              // Use predefined color if available
              if (colorPalette[normalizedType]) {
                return colorPalette[normalizedType];
              }

              // Otherwise pick from fallback colors
              for (const [key, color] of Object.entries(colorPalette)) {
                if (key.startsWith("default") && !usedColors.has(color)) {
                  usedColors.add(color);
                  return color;
                }
              }

              // Ultimate fallback
              return "#9ca3af";
            };

            // Transform API data to chart format
            const transformedData = Object.entries(apiData)
              .map(([key, value]) => ({
                name: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize first letter
                value: Number(value) || 0, // Ensure value is a number
                color: getColorForPlan(key), // Get color for this plan type
              }))
              // Filter out plans with zero users for cleaner display
              .filter((item) => item.value > 0)
              // Sort by value descending for better visualization
              .sort((a, b) => b.value - a.value);

            if (transformedData.length > 0) {
              setData(transformedData);
            } else {
              setData(fallbackData);
            }
          } else {
            setData(fallbackData);
          }

          // Format last updated time
          if (response.data.lastUpdated) {
            formatLastUpdatedTime(response.data.lastUpdated);
          }
        } else {
          // If API returns failure, use fallback data
          setData(fallbackData);
        }
      } catch (error) {
        showToast.error("Failed to load subscription data");
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

  return (
    <div className="h-[280px] w-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Subscription Plans
        </h3>
        <p className="text-sm text-gray-600 font-medium">Distribution</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[80%] w-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center h-[80%] w-full text-gray-500">
          No subscription data available
        </div>
      ) : (
        <div className="flex h-[80%]">
          <ResponsiveContainer width="60%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={70}
                fill="#8884d8"
                dataKey="value"
                strokeWidth={2}
                stroke="#ffffff">
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  borderColor: "#ddd",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  color: "#333",
                }}
                formatter={(value) => [`${value} users`, "Count"]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="w-[40%] flex flex-col justify-center">
            {data.map((entry, index) => (
              <div key={index} className="flex items-center mb-2">
                <div
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-gray-600">{entry.name}</span>
                <span className="text-sm font-semibold ml-auto">
                  {entry.value}
                </span>
              </div>
            ))}
          </div>
        </div>
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
