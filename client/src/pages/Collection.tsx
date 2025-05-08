import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Card } from "@shared/schema";
import SearchAndFilters from "@/components/SearchAndFilters";
import CardGrid from "@/components/CardGrid";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeftRight, 
  Loader2, 
  Plus, 
  Tag, 
  Search, 
  LayoutGrid, 
  List 
} from "lucide-react";
import {
  ToggleGroup,
  ToggleGroupItem
} from "@/components/ui/toggle-group";
import AddEditCardModal from "@/components/AddEditCardModal";
import PriceResearchModal from "@/components/PriceResearchModal";

const Collection = () => {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [sportFilter, setSportFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [deleteCardId, setDeleteCardId] = useState<number | null>(null);
  const [valueCardId, setValueCardId] = useState<number | null>(null);
  const [newValue, setNewValue] = useState("");
  const [isUpdatingValue, setIsUpdatingValue] = useState(false);
  
  // New modal states
  const [addEditModalOpen, setAddEditModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [priceResearchModalOpen, setPriceResearchModalOpen] = useState(false);
  const [researchCard, setResearchCard] = useState<Card | null>(null);

  const { data: allCards = [], isLoading } = useQuery<Card[]>({
    queryKey: ["/api/cards"],
  });

  // Parse URL parameters
  useEffect(() => {
    const params = new URLSearchParams(search);
    const sportParam = params.get("sport");
    const searchParam = params.get("search");
    
    if (sportParam) {
      setSportFilter(sportParam);
    }
    
    if (searchParam) {
      setSearchTerm(searchParam);
    }
  }, [search]);

  // Filter and sort cards
  const filteredCards = allCards.filter(card => {
    // Search filter
    if (searchTerm && !card.playerName.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !card.team?.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !(card.brand && card.brand.toLowerCase().includes(searchTerm.toLowerCase())) &&
        !(card.cardSet && card.cardSet.toLowerCase().includes(searchTerm.toLowerCase())) &&
        !String(card.year).includes(searchTerm)) {
      return false;
    }
    
    // Sport filter
    if (sportFilter !== "all" && card.sport !== sportFilter) {
      return false;
    }
    
    // Year filter
    if (yearFilter !== "all") {
      const year = card.year;
      switch (yearFilter) {
        case "2020+":
          if (year < 2020) return false;
          break;
        case "2010-2019":
          if (year < 2010 || year > 2019) return false;
          break;
        case "2000-2009":
          if (year < 2000 || year > 2009) return false;
          break;
        case "1990-1999":
          if (year < 1990 || year > 1999) return false;
          break;
        case "before1990":
          if (year >= 1990) return false;
          break;
      }
    }
    
    return true;
  }).sort((a, b) => {
    switch (sortBy) {
      case "value-high-to-low":
        return Number(b.currentValue) - Number(a.currentValue);
      case "value-low-to-high":
        return Number(a.currentValue) - Number(b.currentValue);
      case "alphabetical":
        return a.playerName.localeCompare(b.playerName);
      case "newest":
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      case "oldest":
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      case "recent":
      default:
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }
  });

  // Handle search
  const handleSearch = (query: string) => {
    setSearchTerm(query);
  };

  // Handle filters
  const handleSportFilter = (sport: string) => {
    setSportFilter(sport);
  };

  const handleYearFilter = (year: string) => {
    setYearFilter(year);
  };

  const handleSort = (sort: string) => {
    setSortBy(sort);
  };

  // Handle card actions
  const handleEditCard = (card: Card) => {
    setEditingCard(card);
    setAddEditModalOpen(true);
  };

  const handleViewCard = (card: Card) => {
    navigate(`/card/${card.id}`);
  };

  const confirmDeleteCard = (card: Card) => {
    setDeleteCardId(card.id);
  };
  
  const handlePriceResearch = (card: Card) => {
    setResearchCard(card);
    setPriceResearchModalOpen(true);
  };

  const deleteCard = async () => {
    if (!deleteCardId) return;
    
    try {
      await apiRequest("DELETE", `/api/cards/${deleteCardId}`);
      
      toast({
        title: "Card Deleted",
        description: "The card has been removed from your collection.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/cards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setDeleteCardId(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete card. Please try again.",
        variant: "destructive",
      });
    }
  };

  const updateCardValue = (card: Card) => {
    setValueCardId(card.id);
    setNewValue(card.estimatedValue.toString());
  };

  const submitValueUpdate = async () => {
    if (!valueCardId || !newValue) return;
    
    try {
      setIsUpdatingValue(true);
      await apiRequest("PUT", `/api/cards/${valueCardId}`, {
        estimatedValue: Number(newValue)
      });
      
      toast({
        title: "Value Updated",
        description: "The card value has been updated successfully.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/cards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cards", valueCardId] });
      setValueCardId(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update card value. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingValue(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">My Collection</h2>
        <p className="text-gray-600">Manage all your sports cards</p>
      </div>

      {/* Search and Filters */}
      <SearchAndFilters 
        onSearch={handleSearch}
        onSportFilter={handleSportFilter}
        onYearFilter={handleYearFilter}
        onSort={handleSort}
        defaultValues={{
          query: searchTerm,
          sport: sportFilter,
          year: yearFilter,
          sort: sortBy
        }}
      />

      {/* Add New Card Button */}
      <div className="flex justify-end mb-4">
        <Button 
          onClick={() => {
            setEditingCard(null);
            setAddEditModalOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add New Card
        </Button>
      </div>
      
      {/* Card Grid */}
      <CardGrid 
        cards={filteredCards}
        isLoading={isLoading}
        onEdit={handleEditCard}
        onView={handleViewCard}
        onDelete={confirmDeleteCard}
        onUpdateValue={updateCardValue}
        onResearch={handlePriceResearch}
        viewMode="grid"
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteCardId !== null} onOpenChange={() => setDeleteCardId(null)}>
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
            <AlertDialogAction onClick={deleteCard} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Update Value Dialog */}
      <Dialog open={valueCardId !== null} onOpenChange={() => setValueCardId(null)}>
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
              placeholder="Enter new value"
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setValueCardId(null)}>
              Cancel
            </Button>
            <Button onClick={submitValueUpdate} disabled={isUpdatingValue}>
              {isUpdatingValue ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <ArrowLeftRight className="mr-2 h-4 w-4" />
                  Update Value
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add/Edit Card Modal */}
      <AddEditCardModal
        open={addEditModalOpen}
        onOpenChange={setAddEditModalOpen}
        card={editingCard}
        onSuccess={() => {
          setAddEditModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ["/api/cards"] });
          toast({
            title: editingCard ? "Card Updated" : "Card Added",
            description: editingCard
              ? "The card has been updated successfully."
              : "The new card has been added to your collection.",
          });
        }}
      />
      
      {/* Price Research Modal */}
      <PriceResearchModal
        open={priceResearchModalOpen}
        onOpenChange={setPriceResearchModalOpen}
        card={researchCard}
      />
    </div>
  );
};

export default Collection;
