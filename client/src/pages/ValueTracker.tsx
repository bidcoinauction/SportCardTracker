import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card as CardType } from "@shared/schema";
import { ValueChart } from "@/components/Charts";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import ValueUpdateDialog from "@/components/ValueUpdateDialog";
import {
  LineChart,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  Calendar,
  DollarSign,
  PlusCircle,
  Search,
  CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";

const ValueTracker = () => {
  const [, navigate] = useLocation();
  const [timeRange, setTimeRange] = useState("1M");
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch all cards
  const { data: cards = [], isLoading: isCardsLoading } = useQuery<CardType[]>({
    queryKey: ["/api/cards"],
  });

  // Filter cards by search term
  const filteredCards = cards.filter(card => 
    card.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.team.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.brandSet.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Generate value history data for the entire collection
  const getCollectionValueHistory = () => {
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
    return Array.from(valueByDate.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  // Calculate collection statistics
  const calculateCollectionStats = () => {
    if (!cards || cards.length === 0) {
      return { totalValue: 0, totalCards: 0, topGainers: [], topLosers: [] };
    }

    // Calculate current total value
    const totalValue = cards.reduce((sum, card) => sum + Number(card.estimatedValue), 0);
    
    // Calculate value changes for cards with price history
    const cardsWithChanges = cards
      .filter(card => card.priceHistory && card.priceHistory.length >= 2)
      .map(card => {
        const history = card.priceHistory || [];
        const sortedHistory = [...history].sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        
        const oldestValue = sortedHistory[0]?.value || 0;
        const currentValue = sortedHistory[sortedHistory.length - 1]?.value || 0;
        const change = currentValue - oldestValue;
        const percentChange = oldestValue > 0 ? (change / oldestValue) * 100 : 0;
        
        return {
          ...card,
          valueChange: change,
          percentChange
        };
      });
    
    // Get top gainers and losers
    const sortedByChange = [...cardsWithChanges].sort((a, b) => 
      (b.valueChange || 0) - (a.valueChange || 0)
    );
    
    const topGainers = sortedByChange.slice(0, 5).filter(card => card.valueChange > 0);
    const topLosers = sortedByChange.reverse().slice(0, 5).filter(card => card.valueChange < 0);
    
    return { totalValue, totalCards: cards.length, topGainers, topLosers };
  };

  const collectionValueHistory = getCollectionValueHistory();
  const stats = calculateCollectionStats();

  // Selected card data for the dialog
  const selectedCard = cards.find(card => card.id === selectedCardId);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Value Tracker</h2>
        <p className="text-gray-600">Track and analyze the value changes of your collection</p>
      </div>

      {/* Collection Value Overview */}
      <Card className="p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800 flex items-center">
            <LineChart className="mr-2 h-5 w-5 text-primary" />
            Collection Value Overview
          </h3>
          <div className="flex items-center">
            <span className="mr-2 text-lg font-bold">${stats.totalValue.toLocaleString()}</span>
            <Button onClick={() => navigate("/add-card")} size="sm">
              <PlusCircle className="mr-1 h-4 w-4" />
              Add Card
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ValueChart
              data={collectionValueHistory}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              isLoading={isCardsLoading}
            />
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-800 mb-3">Quick Stats</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-gray-600 flex items-center">
                  <DollarSign className="mr-1 h-4 w-4" />
                  Total Value
                </span>
                <span className="font-medium">${stats.totalValue.toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-gray-600 flex items-center">
                  <Calendar className="mr-1 h-4 w-4" />
                  Total Cards
                </span>
                <span className="font-medium">{stats.totalCards}</span>
              </div>
              
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-gray-600 flex items-center">
                  <CalendarClock className="mr-1 h-4 w-4" />
                  Last Update
                </span>
                <span className="font-medium">
                  {collectionValueHistory.length > 0 
                    ? new Date(collectionValueHistory[collectionValueHistory.length - 1].date).toLocaleDateString() 
                    : "N/A"}
                </span>
              </div>
              
              <div>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate("/collection")}
                >
                  View All Cards
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Top Gainers and Losers */}
      <div className="mb-8">
        <Tabs defaultValue="gainers" className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="gainers" className="flex items-center">
                <ArrowUp className="mr-1 h-4 w-4 text-success" />
                Top Gainers
              </TabsTrigger>
              <TabsTrigger value="losers" className="flex items-center">
                <ArrowDown className="mr-1 h-4 w-4 text-error" />
                Top Losers
              </TabsTrigger>
              <TabsTrigger value="all" className="flex items-center">
                <TrendingUp className="mr-1 h-4 w-4" />
                All Cards
              </TabsTrigger>
            </TabsList>
            
            <div className="relative">
              <Input
                type="text"
                placeholder="Search cards..."
                className="w-full pl-10 pr-4 py-2"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <Search className="h-4 w-4" />
              </div>
            </div>
          </div>

          <TabsContent value="gainers">
            <Card>
              {stats.topGainers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Card</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Current Value</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Change</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">% Change</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {stats.topGainers.map((card) => (
                        <tr key={card.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4">
                            <div className="flex items-center">
                              {card.frontImageUrl && (
                                <div className="h-10 w-10 mr-3 rounded overflow-hidden">
                                  <img
                                    src={card.frontImageUrl}
                                    alt={card.playerName}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              )}
                              <div>
                                <div className="font-medium text-gray-900">{card.playerName}</div>
                                <div className="text-xs text-gray-500">{card.year} {card.brandSet}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-gray-900">${Number(card.estimatedValue).toLocaleString()}</td>
                          <td className="px-4 py-4 text-success">+${card.valueChange?.toLocaleString()}</td>
                          <td className="px-4 py-4 text-success">+{card.percentChange?.toFixed(1)}%</td>
                          <td className="px-4 py-4 text-right">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedCardId(card.id)}>
                              Update Value
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => navigate(`/card/${card.id}`)}>
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center">
                  <div className="text-gray-400 mb-2">
                    <TrendingUp className="h-10 w-10 mx-auto" />
                  </div>
                  <p className="text-gray-500">No cards with positive value changes found.</p>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="losers">
            <Card>
              {stats.topLosers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Card</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Current Value</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Change</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">% Change</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {stats.topLosers.map((card) => (
                        <tr key={card.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4">
                            <div className="flex items-center">
                              {card.frontImageUrl && (
                                <div className="h-10 w-10 mr-3 rounded overflow-hidden">
                                  <img
                                    src={card.frontImageUrl}
                                    alt={card.playerName}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              )}
                              <div>
                                <div className="font-medium text-gray-900">{card.playerName}</div>
                                <div className="text-xs text-gray-500">{card.year} {card.brandSet}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-gray-900">${Number(card.estimatedValue).toLocaleString()}</td>
                          <td className="px-4 py-4 text-error">${card.valueChange?.toLocaleString()}</td>
                          <td className="px-4 py-4 text-error">{card.percentChange?.toFixed(1)}%</td>
                          <td className="px-4 py-4 text-right">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedCardId(card.id)}>
                              Update Value
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => navigate(`/card/${card.id}`)}>
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center">
                  <div className="text-gray-400 mb-2">
                    <TrendingUp className="h-10 w-10 mx-auto" />
                  </div>
                  <p className="text-gray-500">No cards with negative value changes found.</p>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="all">
            <Card>
              {filteredCards.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Card</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Sport</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Current Value</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Initial Value</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredCards.map((card) => {
                        const history = card.priceHistory || [];
                        const initialValue = history.length > 0 
                          ? history[0].value 
                          : Number(card.estimatedValue);
                        
                        const valueChange = Number(card.estimatedValue) - initialValue;
                        const percentChange = initialValue > 0 
                          ? (valueChange / initialValue) * 100 
                          : 0;
                        
                        const isPositive = valueChange >= 0;
                        
                        return (
                          <tr key={card.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4">
                              <div className="flex items-center">
                                {card.frontImageUrl && (
                                  <div className="h-10 w-10 mr-3 rounded overflow-hidden">
                                    <img
                                      src={card.frontImageUrl}
                                      alt={card.playerName}
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                )}
                                <div>
                                  <div className="font-medium text-gray-900">{card.playerName}</div>
                                  <div className="text-xs text-gray-500">{card.year} {card.brandSet}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-gray-900 capitalize">{card.sport}</td>
                            <td className="px-4 py-4 text-gray-900">
                              ${Number(card.estimatedValue).toLocaleString()}
                              {valueChange !== 0 && (
                                <span 
                                  className={`ml-1 text-xs ${isPositive ? 'text-success' : 'text-error'}`}
                                >
                                  {isPositive ? '+' : ''}{percentChange.toFixed(1)}%
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-gray-500">${initialValue.toLocaleString()}</td>
                            <td className="px-4 py-4 text-right">
                              <Button variant="ghost" size="sm" onClick={() => setSelectedCardId(card.id)}>
                                Update Value
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => navigate(`/card/${card.id}`)}>
                                View
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center">
                  <div className="text-gray-400 mb-2">
                    <Search className="h-10 w-10 mx-auto" />
                  </div>
                  <p className="text-gray-500">No cards found matching your search.</p>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Value Update Dialog */}
      {selectedCard && (
        <ValueUpdateDialog
          card={selectedCard}
          open={selectedCardId !== null}
          onClose={() => setSelectedCardId(null)}
        />
      )}
    </div>
  );
};

export default ValueTracker;
