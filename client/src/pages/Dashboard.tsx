import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Card as CardType } from "@shared/schema";
import StatisticsGrid from "@/components/StatisticsGrid";
import SearchAndFilters from "@/components/SearchAndFilters";
import CardGrid from "@/components/CardGrid";
import { ValueChart, DistributionCharts } from "@/components/Charts";
import { LayoutDashboard, DollarSign, Trophy, BarChart, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const Dashboard = () => {
  const [, navigate] = useLocation();
  const [timeRange, setTimeRange] = useState("1M");

  // Fetch all cards
  const { data: cards = [], isLoading: isCardsLoading } = useQuery<CardType[]>({
    queryKey: ["/api/cards"],
  });

  // Fetch collection stats
  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ["/api/stats"],
  });

  // Fetch category stats
  const { data: categoryStats = [], isLoading: isCategoryLoading } = useQuery({
    queryKey: ["/api/stats/by-category"],
  });

  // Sort cards by most recently added
  const recentCards = [...(cards || [])]
    .sort((a, b) => {
      const dateA = new Date(a.addedDate).getTime();
      const dateB = new Date(b.addedDate).getTime();
      return dateB - dateA;
    })
    .slice(0, 4);

  // Generate value history data
  const getValueHistoryData = () => {
    // If we don't have cards yet, return empty array
    if (!cards || cards.length === 0) return [];

    // Create a map to store total value per date
    const valueByDate = new Map<string, number>();

    // For each card, add its price history to the map
    cards.forEach(card => {
      if (card.priceHistory && card.priceHistory.length > 0) {
        card.priceHistory.forEach(({ date, value }) => {
          const currentValue = valueByDate.get(date) || 0;
          valueByDate.set(date, currentValue + value);
        });
      }
    });

    // Convert map to array and sort by date
    let result = Array.from(valueByDate.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Filter based on selected time range
    if (timeRange !== "All") {
      const now = new Date();
      let cutoffDate: Date;

      switch (timeRange) {
        case "1M":
          cutoffDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case "3M":
          cutoffDate = new Date(now.setMonth(now.getMonth() - 3));
          break;
        case "6M":
          cutoffDate = new Date(now.setMonth(now.getMonth() - 6));
          break;
        case "1Y":
          cutoffDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
        default:
          cutoffDate = new Date(0); // Beginning of time
      }

      result = result.filter(item => new Date(item.date) >= cutoffDate);
    }

    return result;
  };

  const valueHistoryData = getValueHistoryData();

  // Prepare stats for display
  const statItems = [
    {
      title: "Total Cards",
      value: isStatsLoading ? "--" : stats?.totalCards || 0,
      icon: <LayoutDashboard className="text-primary text-2xl" />,
      iconBgColor: "bg-primary",
      change: {
        value: "12% from last month",
        trend: "up" as const,
      },
    },
    {
      title: "Total Value",
      value: isStatsLoading ? "--" : `$${stats?.totalValue.toLocaleString() || 0}`,
      icon: <DollarSign className="text-accent text-2xl" />,
      iconBgColor: "bg-accent",
      change: {
        value: "8.5% from last month",
        trend: "up" as const,
      },
    },
    {
      title: "Most Valuable",
      value: isStatsLoading ? "--" : `$${stats?.mostValuableCard?.estimatedValue.toLocaleString() || 0}`,
      icon: <Trophy className="text-secondary text-2xl" />,
      iconBgColor: "bg-secondary",
      subtitle: isStatsLoading ? "" : stats?.mostValuableCard?.playerName || "No cards yet",
    },
    {
      title: "Average Value",
      value: isStatsLoading ? "--" : `$${Math.round(stats?.averageValue || 0).toLocaleString()}`,
      icon: <BarChart className="text-error text-2xl" />,
      iconBgColor: "bg-error",
      change: {
        value: "3% from last month",
        trend: "down" as const,
      },
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
        <p className="text-gray-600">Overview of your sports card collection</p>
      </div>

      {/* Summary Stats */}
      <StatisticsGrid stats={statItems} isLoading={isStatsLoading} />

      {/* Search and Filters */}
      <SearchAndFilters onSearch={(query) => navigate(`/collection?search=${query}`)} />

      {/* Recently Added Cards */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Recently Added Cards</h3>
          <Link href="/collection">
            <a className="text-sm font-medium text-primary hover:text-primary-dark">
              View All
            </a>
          </Link>
        </div>

        {cards.length === 0 && !isCardsLoading ? (
          <div className="bg-white rounded-lg shadow p-10 text-center">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Your collection is empty</h3>
            <p className="text-gray-500 mb-4">Add your first sports card to get started.</p>
            <Button onClick={() => navigate("/add-card")}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Your First Card
            </Button>
          </div>
        ) : (
          <CardGrid 
            cards={recentCards} 
            isLoading={isCardsLoading} 
            onView={(card) => navigate(`/card/${card.id}`)}
          />
        )}
      </div>

      {/* Collection Value Chart */}
      <ValueChart 
        data={valueHistoryData}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        isLoading={isCardsLoading}
      />

      {/* Collection by Sport */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Collection by Sport</h3>
        </div>

        <DistributionCharts 
          data={categoryStats}
          isLoading={isCategoryLoading} 
        />
      </div>
    </div>
  );
};

export default Dashboard;
