import React, { useState } from "react";
import { Card } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  ExternalLink, 
  Search, 
  Loader2, 
  DollarSign, 
  BarChart3,
  ArrowDownUp
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import SuccessAnimation from "./SuccessAnimation";

interface PriceResearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: Card | null;
}

// Define interfaces for the eBay price data
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
  const [showAutoPrice, setShowAutoPrice] = useState(false);
  const [priceData, setPriceData] = useState<PriceAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  
  // Generate a search query based on the card details
  const generateSearchQuery = () => {
    if (!card) return "";
    
    const parts = [];
    
    // Start with player name or card name (for Pokémon, etc)
    if (card.playerName) {
      parts.push(card.playerName);
      
      // Check if the player name contains keywords that suggest it's a special card
      const specialCardTerms = ['1st', 'first', 'edition', 'holo', 'foil', 'refractor', 'chrome', 'prizm', 'auto', 'rookie'];
      
      // Add special edition search terms if they're not already in the name
      let hasSpecialTerm = false;
      for (const term of specialCardTerms) {
        if (card.playerName.toLowerCase().includes(term.toLowerCase())) {
          hasSpecialTerm = true;
          break;
        }
      }
      
      // If notes might indicate special edition
      if (!hasSpecialTerm && card.notes) {
        for (const term of specialCardTerms) {
          if (card.notes.toLowerCase().includes(term.toLowerCase())) {
            parts.push(term);
          }
        }
      }
    }
    
    // Add the card set and card number if available - helpful for collectible card identification
    if (card.cardSet) parts.push(card.cardSet);
    if (card.cardNumber) parts.push(`#${card.cardNumber}`);
    
    // Add card specifics - use the card name if available
    if (card.notes && (!parts.some(part => card.notes && part.includes(card.notes)))) {
      parts.push(card.notes);
    }
    
    // Add the year and brand - important for collectibles
    if (card.year) parts.push(card.year.toString());
    if (card.brand) parts.push(card.brand);
    
    // Check for specific rookie cards
    if (card.notes && card.notes.toLowerCase().includes('rookie')) {
      parts.push('RC');
    }
    
    // Add condition as a search filter
    let conditionFilter = "";
    if (card.condition) {
      // First include the condition term in the search
      parts.push(card.condition);
      
      // Then add advanced grading filters
      switch(card.condition.toLowerCase()) {
        case "mint":
        case "gem mint":
          conditionFilter = "(psa&10,bgs&9.5)";
          break;
        case "near mint":
          conditionFilter = "(psa&9,bgs&9)";
          break;
        case "excellent":
          conditionFilter = "(psa&8,bgs&8)";
          break;
        case "very good":
          conditionFilter = "(psa&7,bgs&7)";
          break;
        case "good":
          conditionFilter = "(psa&5,bgs&5)";
          break;
        case "fair":
        case "poor":
          conditionFilter = "(psa&3,bgs&3)";
          break;
        default:
          // Don't add a condition filter if no mapping exists
          break;
      }
    }
    
    // Combine all parts into a search query, removing any duplicates
    const uniqueParts = Array.from(new Set(parts.filter(Boolean)));
    let query = uniqueParts.join(" ");
    
    // Add condition filter at the end if available
    if (conditionFilter) {
      query += " " + conditionFilter;
    }
    
    return query;
  };
  
  const searchQuery = generateSearchQuery();
  
  // Open eBay search in a new tab
  const openEbaySearch = () => {
    if (!searchQuery) return;
    
    // Encode the search query for a URL
    const encodedQuery = encodeURIComponent(searchQuery);
    
    // The URL includes the search parameter for eBay
    window.open(`https://www.ebay.com/sch/i.html?_nkw=${encodedQuery}&_sacat=0&LH_Complete=1&LH_Sold=1`, '_blank');
  };
  
  // Fetch price data from our API
  const fetchPriceData = async () => {
    if (!card?.id) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/cards/${card.id}/price`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch price data: ${response.status}`);
      }
      
      const data = await response.json();
      setPriceData(data);
    } catch (err) {
      console.error("Error fetching price data:", err);
      setError("Failed to fetch price data. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle clicking on the auto price button
  const handleAutoPriceClick = () => {
    setShowAutoPrice(true);
    if (!priceData && !isLoading) {
      fetchPriceData();
    }
  };
  
  // Update card with average price
  const updateCardValue = async () => {
    if (!card?.id || !priceData?.averagePrice) return;
    
    try {
      // Make the request to update only the currentValue field
      const response = await fetch(`/api/cards/${card.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentValue: priceData.averagePrice,
          // Do not touch the purchase price
          purchasePrice: card.purchasePrice
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update card: ${response.status}`);
      }
      
      // Show success animation and redirect to dashboard
      setShowSuccessAnimation(true);
      onOpenChange(false); // Close the modal
    } catch (err) {
      console.error("Error updating card value:", err);
      alert("Failed to update card value. Please try again.");
    }
  };
  
  if (showSuccessAnimation) {
    return (
      <SuccessAnimation 
        message={`Market value updated to ${formatPrice(priceData?.averagePrice || 0)}!`}
        redirectTo="/" 
      />
    );
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[700px] p-6">
        <DialogHeader>
          <DialogTitle>Price Research</DialogTitle>
          <DialogDescription>
            {card ? `Research market prices for ${card.playerName} ${card.year} ${card.brand}` : "Loading card details..."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <h3 className="text-lg font-medium mb-2">Card details for search:</h3>
          <div className="bg-muted p-3 rounded-md mb-4 overflow-auto max-h-[100px]">
            <code className="text-sm">{searchQuery}</code>
          </div>
          
          {!showAutoPrice ? (
            <div className="space-y-4">            
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <h4 className="font-medium text-yellow-800 flex items-center gap-2 mb-2">
                  <Search className="h-4 w-4" />
                  eBay Sold Listings
                </h4>
                <p className="text-sm text-yellow-700 mb-3">
                  View recent eBay sales to determine the current market value of this card.
                </p>
                <Button 
                  onClick={openEbaySearch}
                  className="w-full mb-3"
                  variant="default"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Search eBay Sold Listings
                </Button>
                
                <Button
                  onClick={handleAutoPriceClick}
                  className="w-full"
                  variant="outline"
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Get Automated Price Analysis
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-yellow-800 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    eBay Price Analysis
                  </h4>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowAutoPrice(false)}
                  >
                    Back
                  </Button>
                </div>
                
                {isLoading ? (
                  <div className="py-8 flex flex-col items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-yellow-600 mb-3" />
                    <p className="text-sm text-yellow-700">
                      Analyzing recent eBay sales data...
                    </p>
                    <p className="text-xs text-yellow-600 mt-1">
                      This may take up to 30 seconds
                    </p>
                  </div>
                ) : error ? (
                  <div className="py-6 text-center">
                    <p className="text-sm text-red-600 mb-3">
                      {error}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchPriceData}
                    >
                      Try Again
                    </Button>
                  </div>
                ) : priceData && priceData.items && priceData.items.length > 0 ? (
                  <>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-white rounded-md p-3 border border-yellow-100">
                        <div className="text-xs text-yellow-700 mb-1">Average Price</div>
                        <div className="text-lg font-semibold text-yellow-900">
                          {formatPrice(priceData.averagePrice)}
                        </div>
                      </div>
                      <div className="bg-white rounded-md p-3 border border-yellow-100">
                        <div className="text-xs text-yellow-700 mb-1">Median Price</div>
                        <div className="text-lg font-semibold text-yellow-900">
                          {formatPrice(priceData.medianPrice)}
                        </div>
                      </div>
                      <div className="bg-white rounded-md p-3 border border-yellow-100">
                        <div className="text-xs text-yellow-700 mb-1">Lowest Price</div>
                        <div className="text-base font-medium text-yellow-900">
                          {formatPrice(priceData.minPrice)}
                        </div>
                      </div>
                      <div className="bg-white rounded-md p-3 border border-yellow-100">
                        <div className="text-xs text-yellow-700 mb-1">Highest Price</div>
                        <div className="text-base font-medium text-yellow-900">
                          {formatPrice(priceData.maxPrice)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <h5 className="text-sm font-medium mb-2 text-yellow-800">
                        Recent Sales ({priceData.totalResults} found)
                      </h5>
                      <div className="max-h-[200px] overflow-y-auto border border-yellow-100 rounded-md divide-y divide-yellow-100">
                        {priceData.items.map((item, i) => (
                          <div key={i} className="p-2 hover:bg-yellow-50 text-sm">
                            <div className="flex justify-between">
                              <div className="font-medium line-clamp-1 text-yellow-900">{item.title}</div>
                              <div className="font-semibold text-green-700 whitespace-nowrap ml-2">
                                {formatPrice(item.price)}
                              </div>
                            </div>
                            <div className="flex justify-between mt-1 text-xs text-yellow-600">
                              <div>{item.date}</div>
                              <a 
                                href={item.link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline flex items-center"
                              >
                                View <ExternalLink className="h-3 w-3 ml-1" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <Button 
                      onClick={updateCardValue}
                      className="w-full"
                      variant="default"
                    >
                      <DollarSign className="mr-2 h-4 w-4" />
                      Update Market Value to {formatPrice(priceData.averagePrice)}
                    </Button>
                  </>
                ) : (
                  <div className="py-6 text-center">
                    <p className="text-sm text-yellow-700 mb-3">
                      No price data found for this card.
                    </p>
                    <Button
                      onClick={openEbaySearch}
                      variant="outline"
                      size="sm"
                    >
                      Search Manually
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="border-t pt-4 text-sm text-muted-foreground">
          <p>Tip: For the most accurate results, add specific details like "1st edition", "holo", or "PSA 10" to the card name in your inventory.</p>
        </div>
        
        <DialogFooter className="mt-2">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}