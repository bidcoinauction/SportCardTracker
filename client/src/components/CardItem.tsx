import React from "react";
import { Card } from "@shared/schema";
import { formatDistance } from "date-fns";
import { 
  Edit, 
  Eye, 
  Trash2, 
  Tag, 
  Volleyball, 
  Trophy, 
  Beaker, 
  CableCar, 
  Goal, 
  HelpCircle,
  Search,
  ListFilter 
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getSportSpecificImage, getRandomCardImage } from "@/lib/cardImages";

type CardItemProps = {
  card: Card;
  viewMode?: "grid" | "list";
  onEdit?: () => void;
  onView?: () => void;
  onDelete?: () => void;
  onUpdateValue?: () => void;
  onResearch?: () => void;
};

const CardItem = ({ 
  card, 
  viewMode = "grid", 
  onEdit, 
  onView, 
  onDelete, 
  onUpdateValue,
  onResearch 
}: CardItemProps) => {
  const getSportIcon = (sport: string) => {
    switch (sport.toLowerCase()) {
      case "basketball":
        return <Volleyball />;
      case "football":
        return <Trophy />;
      case "baseball":
        return <Beaker />;
      case "hockey":
        return <CableCar />;
      case "soccer":
        return <Goal />;
      default:
        return <HelpCircle />;
    }
  };

  const getSportColor = (sport: string) => {
    switch (sport.toLowerCase()) {
      case "basketball":
        return "bg-primary text-white";
      case "football":
        return "bg-error text-white";
      case "baseball":
        return "bg-secondary text-white";
      case "hockey":
        return "bg-gray-700 text-white";
      case "soccer":
        return "bg-accent text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getConditionLabel = (condition: string) => {
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

  const getTimeAgo = (dateString: string | Date) => {
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      return formatDistance(date, new Date(), { addSuffix: true });
    } catch (e) {
      return "recently";
    }
  };

  if (viewMode === "list") {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow duration-300 flex">
        <div className="relative w-24 h-24 flex-shrink-0">
          <img
            src={card.frontImageUrl || "https://via.placeholder.com/300x400?text=No+Image"}
            alt={`${card.playerName} ${card.sport} Card`}
            className="w-24 h-24 object-cover"
            onError={(e) => {
              e.currentTarget.onerror = null;
              const sportImage = getSportSpecificImage(card.sport);
              if (sportImage) {
                e.currentTarget.src = sportImage;
              } else {
                e.currentTarget.src = `https://via.placeholder.com/300x400/f5f5f5/666666?text=${encodeURIComponent(card.playerName || 'Sports Card')}`;
              }
            }}
          />
          <div className={cn("absolute top-1 left-1 rounded-full p-1 scale-75", getSportColor(card.sport))}>
            {getSportIcon(card.sport)}
          </div>
        </div>
        
        <div className="flex-grow flex flex-col justify-between p-3">
          <div>
            <div className="flex justify-between items-start">
              <h4 className="font-bold text-gray-800 text-sm">{card.playerName}</h4>
              <div className="bg-gradient-to-r from-accent to-accent-foreground text-white rounded-md px-2 py-1 text-xs font-bold shadow-sm">
                ${typeof card.currentValue === 'number' 
                  ? card.currentValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) 
                  : card.currentValue || '0.00'}
              </div>
            </div>
            <p className="text-xs text-gray-600 mb-1">
              {card.team || "N/A"} · {card.year || "N/A"} {card.brand ? (card.cardSet ? `${card.brand} ${card.cardSet}` : card.brand) : ""}
            </p>
            <div className="flex items-center text-xs space-x-1">
              <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                {getConditionLabel(card.condition)}
              </span>
              {card.cardNumber && (
                <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                  #{card.cardNumber}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex justify-between items-center mt-2">
            <div className="text-xs text-gray-500">
              {card.createdAt ? getTimeAgo(card.createdAt) : "Recently added"}
            </div>
            <div className="flex space-x-1">
              {onEdit && (
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onEdit} title="Edit card">
                  <Edit className="h-3 w-3" />
                </Button>
              )}
              {onResearch && (
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onResearch} title="Research price">
                  <Search className="h-3 w-3" />
                </Button>
              )}
              {!onView ? (
                <Link href={`/card/${card.id}`}>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="View details">
                    <Eye className="h-3 w-3" />
                  </Button>
                </Link>
              ) : (
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onView} title="View details">
                  <Eye className="h-3 w-3" />
                </Button>
              )}
              {onDelete && (
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-error" onClick={onDelete} title="Delete card">
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid view (default)
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow duration-300">
      <div className="relative">
        <div className="w-full h-48 bg-gradient-to-tr from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden">
          <img
            src={card.frontImageUrl || "https://via.placeholder.com/300x400?text=No+Image"}
            alt={`${card.playerName} ${card.sport} Card`}
            className="w-full h-48 object-cover"
            onError={(e) => {
              // If image fails to load, replace with a sport-specific or generic card placeholder
              e.currentTarget.onerror = null;
              
              // Try to get a sport-specific image
              const sportImage = getSportSpecificImage(card.sport);
              
              if (sportImage) {
                e.currentTarget.src = sportImage;
              } else {
                // Fall back to a placeholder with the player name
                e.currentTarget.src = `https://via.placeholder.com/300x400/f5f5f5/666666?text=${encodeURIComponent(card.playerName || 'Sports Card')}`;
              }
            }}
          />
        </div>
        <div className="absolute top-2 right-2 bg-gradient-to-r from-accent to-accent-foreground text-white rounded-lg px-3 py-1.5 text-sm font-bold shadow-md transform hover:scale-105 transition-transform">
          ${typeof card.currentValue === 'number' 
            ? card.currentValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) 
            : card.currentValue || '0.00'}
        </div>
        <div className={cn("absolute top-2 left-2 rounded-full p-1.5", getSportColor(card.sport))}>
          {getSportIcon(card.sport)}
        </div>
      </div>
      <div className="p-4">
        <h4 className="font-bold text-gray-800">{card.playerName}</h4>
        <p className="text-sm text-gray-600 mb-2">
          {card.team || "N/A"} · {card.year || "N/A"} {card.brand ? (card.cardSet ? `${card.brand} ${card.cardSet}` : card.brand) : ""}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full mr-1">
              {getConditionLabel(card.condition)}
            </span>
            {card.cardNumber && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                #{card.cardNumber}
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500">
            Added {card.createdAt ? getTimeAgo(card.createdAt) : "recently"}
          </div>
        </div>
      </div>
      <div className="border-t border-gray-100 px-4 py-2 flex justify-between">
        {onEdit && (
          <Button variant="ghost" size="icon" onClick={onEdit} title="Edit card">
            <Edit className="h-4 w-4" />
          </Button>
        )}
        
        {!onView ? (
          <Link href={`/card/${card.id}`}>
            <Button variant="ghost" size="icon" title="View details">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
        ) : (
          <Button variant="ghost" size="icon" onClick={onView} title="View details">
            <Eye className="h-4 w-4" />
          </Button>
        )}
        
        {onResearch && (
          <Button variant="ghost" size="icon" onClick={onResearch} title="Research price">
            <Search className="h-4 w-4" />
          </Button>
        )}
        
        {onUpdateValue && (
          <Button variant="ghost" size="icon" onClick={onUpdateValue} title="Update value">
            <Tag className="h-4 w-4" />
          </Button>
        )}
        
        {onDelete && (
          <Button variant="ghost" size="icon" className="text-error" onClick={onDelete} title="Delete card">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default CardItem;
