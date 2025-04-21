import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
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
  { name: "Apr", users: 0 },
  { name: "May", users: 0 },
  { name: "Jun", users: 1 },
  { name: "Jul", users: 1 },
  { name: "Aug", users: 1 },
  { name: "Sep", users: 0 },
  { name: "Oct", users: 0 },
  { name: "Nov", users: 0 },
  { name: "Dec", users: 1 },
  { name: "Jan", users: 0 },
  { name: "Feb", users: 0 },
  { name: "Mar", users: 0 },
];

export default function UserGrowthChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [percentageIncrease, setPercentageIncrease] = useState(0);
  const [lastUpdated, setLastUpdated] = useState("just now");

  // Fetch real data from the API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await adminApi.getUserGrowthData();

        if (response.data && response.data.success) {
          // Format the data for the chart
          const chartData = response.data.data || [];
          setData(chartData);

          // Get percentage increase from API or calculate it
          if (response.data.percentageIncrease !== undefined) {
            setPercentageIncrease(
              Math.round(response.data.percentageIncrease * 10) / 10
            );
          } else {
            // Otherwise calculate ourselves from the data
            calculatePercentageIncrease(chartData);
          }

          // Format last updated time
          if (response.data.lastUpdated) {
            formatLastUpdatedTime(response.data.lastUpdated);
          }
        } else {
          // If API returns failure, use fallback data
          setData(fallbackData);
          setPercentageIncrease(0);
        }
      } catch (error) {
        showToast.error("Failed to load user growth data");
        setData(fallbackData);
        setPercentageIncrease(0);
      } finally {
        setLoading(false);
      }
    };

    const calculatePercentageIncrease = (chartData) => {
      const dataLength = chartData.length;
      if (dataLength >= 2) {
        const currentValue = chartData[dataLength - 1].users;
        const previousValue = chartData[dataLength - 2].users;

        if (previousValue > 0) {
          const increase =
            ((currentValue - previousValue) / previousValue) * 100;
          setPercentageIncrease(Math.round(increase * 10) / 10);
        } else {
          // If previous month was 0, and now we have users, that's 100% increase
          if (currentValue > 0) {
            setPercentageIncrease(100);
          } else {
            setPercentageIncrease(0);
          }
        }
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
        <h3 className="text-lg font-semibold text-gray-800">User Growth</h3>
        <p
          className={`text-sm font-medium ${
            percentageIncrease > 0
              ? "text-green-600"
              : percentageIncrease < 0
              ? "text-red-600"
              : "text-gray-600"
          }`}>
          {percentageIncrease > 0 ? "+" : ""}
          {percentageIncrease}% increase in new users
        </p>
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-[80%] w-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="80%">
          <AreaChart
            data={data}
            margin={{
              top: 5,
              right: 10,
              left: 10,
              bottom: 5,
            }}>
            <defs>
              <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
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
              domain={[0, (dataMax) => Math.max(1, dataMax + 1)]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                borderColor: "#ddd",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                color: "#333",
              }}
              itemStyle={{ color: "#3b82f6" }}
              cursor={{
                stroke: "#3b82f6",
                strokeWidth: 1,
                strokeDasharray: "4 4",
              }}
            />
            <Area
              type="monotone"
              dataKey="users"
              stroke="#3b82f6"
              strokeWidth={3}
              fill="url(#colorUsers)"
              dot={{ stroke: "#3b82f6", strokeWidth: 2, r: 4, fill: "white" }}
              activeDot={{
                stroke: "#3b82f6",
                strokeWidth: 2,
                r: 6,
                fill: "white",
              }}
            />
          </AreaChart>
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
