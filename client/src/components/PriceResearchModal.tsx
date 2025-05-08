import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/utils";
import {
  Card as CardUI,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  DollarSign,
  ExternalLink,
  Loader2,
  Search,
  TrendingUp,
  Calendar,
} from "lucide-react";

interface PriceResearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: Card | null;
}

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

export default function PriceResearchModal({ 
  open, 
  onOpenChange, 
  card 
}: PriceResearchModalProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Generate search query when card changes
  useEffect(() => {
    if (card) {
      const query = generateSearchQuery(card);
      setSearchQuery(query);
    }
  }, [card]);

  // Get price data
  const {
    data: priceData,
    isLoading,
    error,
    refetch
  } = useQuery<PriceAnalysis>({
    queryKey: ['prices', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) {
        throw new Error("Please enter a search query");
      }
      
      setIsSearching(true);
      try {
        const response = await fetch(`/api/prices?q=${encodeURIComponent(searchQuery)}`);
        if (!response.ok) {
          throw new Error("Failed to fetch price data");
        }
        return response.json();
      } finally {
        setIsSearching(false);
      }
    },
    enabled: false, // Don't run query automatically
  });

  // Handle search
  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Search query is empty",
        description: "Please enter a search term",
        variant: "destructive",
      });
      return;
    }
    
    refetch();
  };

  // Generate search query from card details
  const generateSearchQuery = (card: Card): string => {
    const parts = [
      card.playerName,
      card.year,
      card.brand,
      card.cardSet,
      card.cardNumber ? `#${card.cardNumber}` : '',
      card.sport
    ];
    
    return parts.filter(Boolean).join(' ');
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  // Update card value with the average price (default)
  const updateCardValue = () => {
    if (!priceData) return;
    updateCardValueWithPrice(priceData.averagePrice);
  };
  
  // Generic function to update card value with any price
  const updateCardValueWithPrice = async (price: number) => {
    if (!card || !price) return;
    
    try {
      const response = await fetch(`/api/cards/${card.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentValue: price,
          lastValueUpdate: new Date().toISOString(),
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update card value");
      }
      
      // Invalidate any cached card data
      queryClient.invalidateQueries({ queryKey: ["/api/cards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cards", card.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      
      toast({
        title: "Card Value Updated",
        description: `Updated ${card.playerName} value to ${formatPrice(price)}`,
      });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Update Failed",
        description: (error as Error).message || "Failed to update card value",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Price Research</DialogTitle>
          <DialogDescription>
            Research recent eBay sold listings for your card to determine its market value.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search Area */}
          <div className="space-y-2">
            <Label htmlFor="search-query">Search Query</Label>
            <div className="flex gap-2">
              <Input
                id="search-query"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
                placeholder="e.g. 2003 Topps Chrome LeBron James Rookie"
              />
              <Button onClick={handleSearch} disabled={isSearching || isLoading}>
                {isSearching || isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Search
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Pro tip: Include player name, year, brand, and card number for best results.
            </p>
          </div>

          {/* Results Area */}
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-[120px] w-full" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Skeleton className="h-[200px] w-full" />
                <Skeleton className="h-[200px] w-full" />
                <Skeleton className="h-[200px] w-full" />
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
              {(error as Error).message || "Failed to fetch price data. Please try again."}
            </div>
          ) : priceData ? (
            <div className="space-y-6">
              {/* Price Summary */}
              <CardUI>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <BarChart className="h-5 w-5 mr-2" /> 
                    Price Analysis
                  </CardTitle>
                  <CardDescription>
                    Based on {priceData.totalResults} recent eBay sales
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Average Price</p>
                      <p className="text-2xl font-bold text-primary">
                        {formatPrice(priceData.averagePrice)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Median Price</p>
                      <p className="text-2xl font-bold">
                        {formatPrice(priceData.medianPrice)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Lowest Price</p>
                      <p className="text-xl font-medium text-gray-600">
                        {formatPrice(priceData.minPrice)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Highest Price</p>
                      <p className="text-xl font-medium text-gray-600">
                        {formatPrice(priceData.maxPrice)}
                      </p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  {card && (
                    <div className="w-full space-y-2">
                      <Button 
                        onClick={updateCardValue} 
                        className="w-full bg-primary hover:bg-primary/90 text-white"
                      >
                        <TrendingUp className="mr-2 h-4 w-4" />
                        Update to Average: {formatPrice(priceData.averagePrice)}
                      </Button>
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          onClick={() => updateCardValueWithPrice(priceData.medianPrice)} 
                          variant="outline" 
                          className="border-primary text-primary hover:bg-primary/10"
                        >
                          <DollarSign className="mr-1 h-4 w-4" />
                          Use Median
                        </Button>
                        <Button 
                          onClick={() => updateCardValueWithPrice(priceData.maxPrice)} 
                          variant="outline" 
                          className="border-accent text-accent hover:bg-accent/10"
                        >
                          <TrendingUp className="mr-1 h-4 w-4" />
                          Use Highest
                        </Button>
                      </div>
                    </div>
                  )}
                </CardFooter>
              </CardUI>

              {/* Recent Sold Listings */}
              <div>
                <h3 className="text-lg font-medium mb-3">Recent Sales</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {priceData.items.map((item, index) => (
                    <CardUI key={index} className="overflow-hidden">
                      <div className="flex">
                        {item.imageUrl && (
                          <div className="w-24 h-24 flex-shrink-0 bg-gray-100 flex items-center justify-center">
                            <img 
                              src={item.imageUrl} 
                              alt={item.title}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = 'https://via.placeholder.com/100x100?text=No+Image';
                              }}
                            />
                          </div>
                        )}
                        <div className="flex-1 p-4">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <p className="font-medium line-clamp-2">{item.title}</p>
                              <p className="text-lg font-bold text-green-600">{formatPrice(item.price)}</p>
                              <div className="flex items-center text-gray-500 text-sm">
                                <Calendar className="h-3 w-3 mr-1" />
                                {formatDate(item.date)}
                              </div>
                            </div>
                            <a 
                              href={item.link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:text-primary/90"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </CardUI>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}