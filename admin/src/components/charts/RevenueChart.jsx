import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Sample data - in a real app, this would come from your API
const sampleData = [
  {
    name: "Jan",
    revenue: 4000,
  },
  {
    name: "Feb",
    revenue: 3000,
  },
  {
    name: "Mar",
    revenue: 5000,
  },
  {
    name: "Apr",
    revenue: 2780,
  },
  {
    name: "May",
    revenue: 1890,
  },
  {
    name: "Jun",
    revenue: 2390,
  },
  {
    name: "Jul",
    revenue: 3490,
  },
];

export default function RevenueChart() {
  const [data, setData] = useState(sampleData);

  return (
    <div className="h-[280px] w-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Revenue Overview
        </h3>
        <p className="text-sm text-gray-600 font-medium">Monthly Revenue</p>
      </div>
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
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FFCF50" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#FFCF50" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(0,0,0,0.1)"
            vertical={false}
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
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              borderColor: "#ddd",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              color: "#333",
            }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#FFCF50"
            fillOpacity={1}
            fill="url(#colorRevenue)"
          />
        </AreaChart>
      </ResponsiveContainer>
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
        <span className="whitespace-nowrap">Last updated 3 hours ago</span>
      </div>
    </div>
  );
}
