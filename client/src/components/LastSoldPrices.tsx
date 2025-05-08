import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Search, Tag, DollarSign, TrendingUp, TrendingDown, ArrowRight, ExternalLink } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";

// Types for eBay price data
interface EbaySoldItem {
  title: string;
  price: number;
  date: string;
  link: string;
  imageUrl?: string;
}

interface PriceAnalysis {
  items: EbaySoldItem[];
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  medianPrice: number;
  totalResults: number;
  searchQuery: string;
}

interface LastSoldPricesProps {
  cardId?: number;
  defaultSearchQuery?: string;
}

export function LastSoldPrices({ cardId, defaultSearchQuery = "" }: LastSoldPricesProps) {
  const [searchQuery, setSearchQuery] = useState(defaultSearchQuery);
  
  // Query for individual card price analysis
  const cardPriceQuery = useQuery({
    queryKey: ['/api/cards', cardId, 'price'],
    queryFn: () => apiRequest<PriceAnalysis & { card: any }>(`/api/cards/${cardId}/price`),
    enabled: cardId !== undefined
  });
  
  // Query for custom search
  const searchPriceQuery = useQuery({
    queryKey: ['/api/prices', searchQuery],
    queryFn: () => apiRequest<PriceAnalysis>(`/api/prices?query=${encodeURIComponent(searchQuery)}`),
    enabled: searchQuery.length > 0 && cardId === undefined
  });
  
  // Determine which query to use
  const query = cardId !== undefined ? cardPriceQuery : searchPriceQuery;
  const data = query.data;
  
  // Handler for search submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length > 0) {
      searchPriceQuery.refetch();
    }
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  // Calculate price change if card has a current value
  const calculatePriceChange = () => {
    if (cardId !== undefined && cardPriceQuery.data?.card?.currentValue) {
      const currentValue = parseFloat(cardPriceQuery.data.card.currentValue);
      const marketValue = cardPriceQuery.data.averagePrice;
      const difference = marketValue - currentValue;
      const percentChange = (difference / currentValue) * 100;
      
      return {
        difference,
        percentChange,
        isIncrease: difference > 0
      };
    }
    return null;
  };
  
  const priceChange = calculatePriceChange();
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            eBay Last Sold Prices
          </div>
          {cardId === undefined && (
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <Input
                placeholder="Search card prices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
              />
              <Button type="submit" size="sm" className="h-9">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </form>
          )}
        </CardTitle>
        <CardDescription>
          {data ? (
            <>
              Showing results for <Badge variant="outline">{data.searchQuery}</Badge>
            </>
          ) : (
            <>Search for cards to view recent eBay sales prices</>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : query.isError ? (
          <div className="text-center py-8 text-muted-foreground">
            Error loading price data. Please try again.
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="p-4 border rounded-lg">
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Average Price</h4>
                <div className="text-2xl font-bold">{formatCurrency(data.averagePrice)}</div>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Median Price</h4>
                <div className="text-2xl font-bold">{formatCurrency(data.medianPrice)}</div>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Lowest Sold</h4>
                <div className="text-2xl font-bold">{formatCurrency(data.minPrice)}</div>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Highest Sold</h4>
                <div className="text-2xl font-bold">{formatCurrency(data.maxPrice)}</div>
              </div>
            </div>
            
            {priceChange && (
              <div className="mb-6 p-4 border rounded-lg bg-accent/10">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-sm font-medium">Your Card vs Market Value</h4>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-2 items-center">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <span className="text-muted-foreground">Your Value:</span>
                    <span className="font-semibold">
                      {formatCurrency(parseFloat(cardPriceQuery.data.card.currentValue))}
                    </span>
                  </div>
                  
                  <ArrowRight className="h-5 w-5 text-muted-foreground mx-2" />
                  
                  <div className="flex gap-2 items-center">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <span className="text-muted-foreground">Market Value:</span>
                    <span className="font-semibold">
                      {formatCurrency(data.averagePrice)}
                    </span>
                  </div>
                  
                  <div className={`ml-4 flex items-center gap-1 ${
                    priceChange.isIncrease ? "text-green-500" : "text-red-500"
                  }`}>
                    {priceChange.isIncrease ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    <span className="font-semibold">
                      {priceChange.isIncrease ? "+" : ""}
                      {formatCurrency(priceChange.difference)} ({priceChange.isIncrease ? "+" : ""}
                      {priceChange.percentChange.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            <h3 className="text-lg font-semibold mb-3">Recent Sales ({data.items.length})</h3>
            
            <ScrollArea className="h-[350px] w-full pr-4">
              <div className="space-y-4">
                {data.items.map((item, i) => (
                  <div key={i} className="flex flex-col sm:flex-row gap-4 pb-4">
                    {item.imageUrl && (
                      <div className="w-20 h-20 overflow-hidden rounded border flex-shrink-0">
                        <img 
                          src={item.imageUrl} 
                          alt={item.title} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-medium line-clamp-2">{item.title}</h4>
                        <div className="font-bold text-lg">{formatCurrency(item.price)}</div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="text-sm text-muted-foreground">Sold on {item.date}</div>
                        <a 
                          href={item.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-blue-500 hover:underline"
                        >
                          View on eBay
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                    {i < data.items.length - 1 && <Separator className="mt-4" />}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            {cardId !== undefined 
              ? "Loading price data for this card..." 
              : "Enter a search query to view recent sales data"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}