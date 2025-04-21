import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Sample data - in a real app, this would come from your API
const sampleData = [
  {
    name: "Jan",
    orders: 40,
    revenue: 2400,
  },
  {
    name: "Feb",
    orders: 30,
    revenue: 1398,
  },
  {
    name: "Mar",
    orders: 20,
    revenue: 9800,
  },
  {
    name: "Apr",
    orders: 27,
    revenue: 3908,
  },
  {
    name: "May",
    orders: 18,
    revenue: 4800,
  },
  {
    name: "Jun",
    orders: 23,
    revenue: 3800,
  },
  {
    name: "Jul",
    orders: 34,
    revenue: 4300,
  },
];

export default function OrdersChart() {
  const [data, setData] = useState(sampleData);

  return (
    <div className="h-[280px] w-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Orders & Revenue
        </h3>
        <div className="flex space-x-2">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
            <span className="text-xs text-gray-600">Orders</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
            <span className="text-xs text-gray-600">Revenue</span>
          </div>
        </div>
      </div>
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
          <Line
            type="monotone"
            dataKey="orders"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#22c55e"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
