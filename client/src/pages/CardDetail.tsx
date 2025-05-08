import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Card as CardUI } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ValueChart } from "@/components/Charts";
import { LastSoldPrices } from "@/components/LastSoldPrices";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CalendarClock, 
  Edit, 
  Trash, 
  ArrowLeft,
  Calendar,
  Tag,
  BadgeInfo,
  Loader2,
  ImageIcon,
  FileText,
  DollarSign
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const CardDetail = () => {
  const { id } = useParams();
  const cardId = parseInt(id);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [valueDialogOpen, setValueDialogOpen] = useState(false);
  const [newValue, setNewValue] = useState("");
  const [timeRange, setTimeRange] = useState("All");

  // Fetch card details
  const { data: card, isLoading } = useQuery<Card>({
    queryKey: ["/api/cards", cardId],
  });

  // Delete card mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/cards/${cardId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      
      toast({
        title: "Card Deleted",
        description: "The card has been removed from your collection.",
      });
      
      navigate("/collection");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete card: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update value mutation
  const updateValueMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", `/api/cards/${cardId}`, {
        estimatedValue: Number(newValue)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cards", cardId] });
      
      toast({
        title: "Value Updated",
        description: "The card value has been updated successfully.",
      });
      
      setValueDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update value: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Format condition
  const formatCondition = (condition: string) => {
    switch (condition) {
      case "mint":
        return "Mint";
      case "nearMint":
        return "Near Mint";
      case "excellent":
        return "Excellent";
      case "veryGood":
        return "Very Good";
      case "good":
        return "Good";
      case "fair":
        return "Fair";
      case "poor":
        return "Poor";
      default:
        return condition;
    }
  };

  // Get price history data for chart
  const getValueHistoryData = () => {
    if (!card || !card.priceHistory) return [];
    
    let result = [...card.priceHistory].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
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
          cutoffDate = new Date(0);
      }

      result = result.filter(item => new Date(item.date) >= cutoffDate);
    }
    
    return result;
  };

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center items-center h-[calc(100vh-64px)]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="ml-2 text-lg text-gray-600">Loading card details...</span>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow p-10 text-center">
          <div className="text-6xl mb-4">❌</div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Card not found</h3>
          <p className="text-gray-500 mb-4">The card you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => navigate("/collection")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Collection
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Back button and actions */}
      <div className="flex justify-between items-center mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => setValueDialogOpen(true)}>
            <Tag className="mr-2 h-4 w-4" />
            Update Value
          </Button>
          <Button variant="outline" onClick={() => navigate(`/add-card?edit=${cardId}`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Card
          </Button>
          <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
            <Trash className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Card details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Card image */}
        <CardUI className="md:col-span-1">
          <div className="p-4">
            <div className="aspect-[3/4] rounded-lg overflow-hidden">
              <img 
                src={card.frontImageUrl || "https://via.placeholder.com/300x400?text=No+Image"} 
                alt={`${card.playerName} card front`}
                className="w-full h-full object-contain"
              />
            </div>
            {card.backImageUrl && (
              <div className="mt-4 aspect-[3/4] rounded-lg overflow-hidden">
                <img 
                  src={card.backImageUrl} 
                  alt={`${card.playerName} card back`}
                  className="w-full h-full object-contain"
                />
              </div>
            )}
          </div>
        </CardUI>

        {/* Card information */}
        <CardUI className="md:col-span-2">
          <Tabs defaultValue="info">
            <div className="p-6">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">{card.playerName}</h1>
                <div className="flex items-center text-gray-600">
                  <span>{card.year} {card.brandSet}</span>
                  <span className="mx-2">•</span>
                  <span>{card.team}</span>
                  <span className="mx-2">•</span>
                  <span className="capitalize">{card.sport}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary text-white">
                    ${card.estimatedValue.toLocaleString()}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {formatCondition(card.condition)}
                  </span>
                  {card.grade && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {card.grade}
                    </span>
                  )}
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    <CalendarClock className="mr-1 h-3 w-3" />
                    {new Date(card.addedDate).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <TabsList className="mb-4">
                <TabsTrigger value="info" className="flex items-center">
                  <BadgeInfo className="mr-2 h-4 w-4" />
                  Details
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center">
                  <Tag className="mr-2 h-4 w-4" />
                  Value History
                </TabsTrigger>
                <TabsTrigger value="market" className="flex items-center">
                  <DollarSign className="mr-2 h-4 w-4" />
                  eBay Prices
                </TabsTrigger>
                {card.notes && (
                  <TabsTrigger value="notes" className="flex items-center">
                    <FileText className="mr-2 h-4 w-4" />
                    Notes
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="info">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Player</h3>
                      <p className="mt-1 text-base font-medium text-gray-900">{card.playerName}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Team</h3>
                      <p className="mt-1 text-base font-medium text-gray-900">{card.team}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Sport</h3>
                      <p className="mt-1 text-base font-medium text-gray-900 capitalize">{card.sport}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Year</h3>
                      <p className="mt-1 text-base font-medium text-gray-900">{card.year}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Brand/Set</h3>
                      <p className="mt-1 text-base font-medium text-gray-900">{card.brandSet}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Card Number</h3>
                      <p className="mt-1 text-base font-medium text-gray-900">{card.cardNumber || "-"}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Condition</h3>
                      <p className="mt-1 text-base font-medium text-gray-900">{formatCondition(card.condition)}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Grade</h3>
                      <p className="mt-1 text-base font-medium text-gray-900">{card.grade || "Raw (Ungraded)"}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Current Value</h3>
                      <p className="mt-1 text-base font-medium text-green-600">${card.estimatedValue.toLocaleString()}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Added to Collection</h3>
                      <p className="mt-1 text-base font-medium text-gray-900">{new Date(card.addedDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="history">
                <ValueChart
                  data={getValueHistoryData()}
                  timeRange={timeRange}
                  onTimeRangeChange={setTimeRange}
                  isLoading={isLoading}
                />
              </TabsContent>

              <TabsContent value="market">
                <LastSoldPrices cardId={cardId} />
              </TabsContent>
              
              {card.notes && (
                <TabsContent value="notes">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Notes</h3>
                    <p className="text-gray-700 whitespace-pre-line">{card.notes}</p>
                  </div>
                </TabsContent>
              )}
            </div>
          </Tabs>
        </CardUI>
      </div>

      {/* Update value dialog */}
      <Dialog open={valueDialogOpen} onOpenChange={setValueDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Card Value</DialogTitle>
            <DialogDescription>
              Enter the new estimated value for this card.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex items-center gap-2 my-4">
            <span className="text-lg font-medium">$</span>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder={card.estimatedValue.toString()}
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setValueDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => updateValueMutation.mutate()}
              disabled={updateValueMutation.isPending || !newValue}
            >
              {updateValueMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Value"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the card 
              from your collection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteMutation.mutate()} 
              className="bg-red-500 hover:bg-red-600"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CardDetail;
