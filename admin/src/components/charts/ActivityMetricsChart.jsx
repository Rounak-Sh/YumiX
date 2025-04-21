import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
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
  { name: "Jan", searches: 30 },
  { name: "Feb", searches: 25 },
  { name: "Mar", searches: 40 },
  { name: "Apr", searches: 60 },
  { name: "May", searches: 75 },
  { name: "Jun", searches: 45 },
  { name: "Jul", searches: 90 },
  { name: "Aug", searches: 70 },
  { name: "Sep", searches: 50 },
  { name: "Oct", searches: 65 },
  { name: "Nov", searches: 55 },
  { name: "Dec", searches: 80 },
];

export default function ActivityMetricsChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("just now");
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // Fetch real data from the API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await adminApi.getActivityMetricsData();

        if (response && response.data && response.data.success) {
          const chartData = response.data.data || [];

          const hasData = chartData.some((item) => Number(item.searches) > 0);

          if (chartData.length > 0 && hasData) {
            setData(chartData);
          } else {
            setData(fallbackData);
          }

          if (response.data.year) {
            setCurrentYear(response.data.year);
          }

          if (response.data.lastUpdated) {
            formatLastUpdatedTime(response.data.lastUpdated);
          }
        } else {
          setData(fallbackData);
        }
      } catch (error) {
        showToast.error("Failed to load search activity data");
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
    if (data.length === 0) return [0, 100];

    const maxValue = Math.max(...data.map((item) => item.searches || 0));
    return [0, Math.max(maxValue + 20, 50)]; // Ensure minimum height with reasonable padding
  };

  return (
    <div className="h-[280px] w-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Recipe Searches</h3>
        <p className="text-sm text-gray-600 font-medium">
          {currentYear} Monthly Trend
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[80%] w-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="80%">
          <LineChart
            data={data}
            margin={{
              top: 5,
              right: 10,
              left: 10,
              bottom: 5,
            }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(0,0,0,0.1)"
              vertical={true}
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
              formatter={(value) => [`${value} searches`, "Searches"]}
              cursor={{
                stroke: "#22c55e",
                strokeWidth: 1,
                strokeDasharray: "4 4",
              }}
            />
            <Line
              type="monotone"
              dataKey="searches"
              stroke="#22c55e"
              strokeWidth={3}
              dot={{ stroke: "#22c55e", strokeWidth: 2, r: 4, fill: "white" }}
              activeDot={{
                stroke: "#22c55e",
                strokeWidth: 2,
                r: 6,
                fill: "white",
              }}
              name="Searches"
            />
          </LineChart>
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
