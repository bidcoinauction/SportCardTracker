import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  LayoutList, 
  DollarSign, 
  Award, 
  BarChart,
  ArrowUp,
  ArrowDown
} from "lucide-react";

type StatItem = {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBgColor: string;
  change?: {
    value: string;
    trend: "up" | "down" | "neutral";
  };
  subtitle?: string;
};

type StatisticsGridProps = {
  stats: StatItem[];
  isLoading?: boolean;
};

const StatisticsGrid = ({ stats, isLoading = false }: StatisticsGridProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array(4)
          .fill(0)
          .map((_, index) => (
            <Card key={index} className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-28" />
                </div>
                <Skeleton className="h-12 w-12 rounded-full" />
              </div>
              <div className="mt-2">
                <Skeleton className="h-4 w-32" />
              </div>
            </Card>
          ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, index) => (
        <Card key={index} className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">{stat.title}</p>
              <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
            </div>
            <div className={`h-12 w-12 rounded-full ${stat.iconBgColor} bg-opacity-10 flex items-center justify-center`}>
              {stat.icon}
            </div>
          </div>
          {stat.change && (
            <div className="mt-2">
              <span
                className={`text-xs font-medium flex items-center ${
                  stat.change.trend === "up"
                    ? "text-success"
                    : stat.change.trend === "down"
                    ? "text-error"
                    : "text-gray-600"
                }`}
              >
                {stat.change.trend === "up" ? (
                  <ArrowUp className="mr-1 h-3 w-3" />
                ) : stat.change.trend === "down" ? (
                  <ArrowDown className="mr-1 h-3 w-3" />
                ) : null}
                {stat.change.value}
              </span>
            </div>
          )}
          {stat.subtitle && (
            <div className="mt-2">
              <span className="text-xs font-medium text-gray-600">
                {stat.subtitle}
              </span>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
};

export default StatisticsGrid;
