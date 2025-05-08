import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { Card } from "@/components/ui/card";
import { LineChart, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

// Value Chart
type ValueChartProps = {
  data: Array<{ date: string; value: number }>;
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
  isLoading?: boolean;
};

export const ValueChart = ({
  data,
  timeRange,
  onTimeRangeChange,
  isLoading = false,
}: ValueChartProps) => {
  const timeRanges = ["1M", "3M", "6M", "1Y", "All"];

  if (isLoading || data.length === 0) {
    return (
      <Card className="p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-800">Collection Value Over Time</h3>
          <div className="flex space-x-2">
            {timeRanges.map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? "default" : "outline"}
                size="sm"
                onClick={() => onTimeRangeChange(range)}
              >
                {range}
              </Button>
            ))}
          </div>
        </div>

        <div className="w-full h-64 bg-gray-50 rounded flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-400 mb-2">
              <LineChart className="h-10 w-10 mx-auto" />
            </div>
            <p className="text-gray-500 text-sm">
              {isLoading ? "Loading chart data..." : "No chart data available"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <p className="text-xs text-gray-500">1 Month Change</p>
            <p className="text-lg font-semibold text-gray-500">--</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">6 Month Change</p>
            <p className="text-lg font-semibold text-gray-500">--</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">1 Year Change</p>
            <p className="text-lg font-semibold text-gray-500">--</p>
          </div>
        </div>
      </Card>
    );
  }

  // Format date for tooltip
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  // Calculate period changes
  const calculateChange = (periodDays: number) => {
    if (data.length < 2) return { value: "--", percent: "--", isPositive: true };

    const now = new Date();
    const periodDate = new Date(now.setDate(now.getDate() - periodDays));
    
    const currentValue = data[data.length - 1].value;
    
    // Find the closest date to the period start
    let periodStartValue = data[0].value;
    for (const item of data) {
      const itemDate = new Date(item.date);
      if (itemDate >= periodDate) {
        periodStartValue = item.value;
        break;
      }
    }
    
    const change = currentValue - periodStartValue;
    const percentChange = (change / periodStartValue) * 100;
    
    return {
      value: `$${Math.abs(change).toLocaleString()}`,
      percent: `(${Math.abs(percentChange).toFixed(1)}%)`,
      isPositive: change >= 0
    };
  };

  const oneMonthChange = calculateChange(30);
  const sixMonthChange = calculateChange(180);
  const oneYearChange = calculateChange(365);

  return (
    <Card className="p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-800">Collection Value Over Time</h3>
        <div className="flex space-x-2">
          {timeRanges.map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? "default" : "outline"}
              size="sm"
              onClick={() => onTimeRangeChange(range)}
            >
              {range}
            </Button>
          ))}
        </div>
      </div>

      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(date) => formatDate(date)}
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              tickFormatter={(value) => `$${value}`}
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              formatter={(value) => [`$${value}`, "Value"]}
              labelFormatter={(date) => formatDate(date)}
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="hsl(var(--primary))" 
              fill="hsl(var(--primary) / 20%)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-4">
        <div className="text-center">
          <p className="text-xs text-gray-500">1 Month Change</p>
          <p className={`text-lg font-semibold ${oneMonthChange.isPositive ? "text-success" : "text-error"}`}>
            {oneMonthChange.isPositive ? "+" : "-"}{oneMonthChange.value} {oneMonthChange.percent}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">6 Month Change</p>
          <p className={`text-lg font-semibold ${sixMonthChange.isPositive ? "text-success" : "text-error"}`}>
            {sixMonthChange.isPositive ? "+" : "-"}{sixMonthChange.value} {sixMonthChange.percent}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">1 Year Change</p>
          <p className={`text-lg font-semibold ${oneYearChange.isPositive ? "text-success" : "text-error"}`}>
            {oneYearChange.isPositive ? "+" : "-"}{oneYearChange.value} {oneYearChange.percent}
          </p>
        </div>
      </div>
    </Card>
  );
};

// Distribution Chart
type CategoryData = {
  sport: string;
  totalValue: number;
  percentage: number;
};

type DistributionChartsProps = {
  data: CategoryData[];
  isLoading?: boolean;
};

export const DistributionCharts = ({
  data,
  isLoading = false,
}: DistributionChartsProps) => {
  // Colors for pie chart
  const COLORS = [
    "hsl(var(--primary))", 
    "hsl(var(--error))", 
    "hsl(var(--secondary))", 
    "hsl(var(--accent))", 
    "#7F7F7F", 
    "#5470C6"
  ];

  if (isLoading || data.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6">
          <h4 className="text-sm font-medium text-gray-500 mb-4">Distribution</h4>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-gray-400 mb-2">
                <LineChart className="h-10 w-10 mx-auto" />
              </div>
              <p className="text-gray-500 text-sm">
                {isLoading ? "Loading distribution data..." : "No distribution data available"}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h4 className="text-sm font-medium text-gray-500 mb-4">Value by Category</h4>
          <div className="space-y-4 flex flex-col justify-center h-64">
            <p className="text-center text-gray-500">
              {isLoading ? "Loading category data..." : "No category data available"}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // Format sport name
  const formatSport = (sport: string) => {
    return sport.charAt(0).toUpperCase() + sport.slice(1);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="p-6">
        <h4 className="text-sm font-medium text-gray-500 mb-4">Distribution</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                dataKey="totalValue"
                nameKey="sport"
                label={({ sport, percentage }) => 
                  `${formatSport(sport)} ${(percentage || 0).toFixed(0)}%`
                }
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]} 
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [`$${(value || 0).toLocaleString()}`, "Value"]}
                labelFormatter={(name) => formatSport(name)}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-6">
        <h4 className="text-sm font-medium text-gray-500 mb-4">Value by Category</h4>
        <div className="space-y-4">
          {data.map((category, index) => (
            <div key={index}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">
                  {formatSport(category.sport)}
                </span>
                <span className="text-sm font-medium text-gray-700">
                  ${(category.totalValue || 0).toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="h-2.5 rounded-full"
                  style={{
                    width: `${category.percentage || 0}%`,
                    backgroundColor: COLORS[index % COLORS.length],
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
