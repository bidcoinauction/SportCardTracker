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
  HelpCircle 
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

type CardItemProps = {
  card: Card;
  onEdit?: (card: Card) => void;
  onView?: (card: Card) => void;
  onDelete?: (card: Card) => void;
  onUpdateValue?: (card: Card) => void;
};

const CardItem = ({ card, onEdit, onView, onDelete, onUpdateValue }: CardItemProps) => {
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

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow duration-300">
      <div className="relative">
        <div className="w-full h-48 bg-gradient-to-tr from-gray-100 to-gray-200 flex items-center justify-center">
          <img
            src={card.frontImageUrl || "https://via.placeholder.com/300x400?text=No+Image"}
            alt={`${card.playerName} ${card.sport} Card`}
            className="w-full h-48 object-cover"
            onError={(e) => {
              // If image fails to load, replace with a generated card-like placeholder
              e.currentTarget.onerror = null;
              e.currentTarget.src = `https://via.placeholder.com/300x400/f5f5f5/666666?text=${encodeURIComponent(card.playerName || 'Sports Card')}`;
            }}
          />
        </div>
        <div className="absolute top-2 right-2 bg-accent text-white rounded-full px-2 py-1 text-xs font-medium">
          ${typeof card.currentValue === 'number' ? card.currentValue.toLocaleString() : card.currentValue || 0}
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
          <Button variant="ghost" size="icon" onClick={() => onEdit(card)}>
            <Edit className="h-4 w-4" />
          </Button>
        )}
        
        {!onView ? (
          <Link href={`/card/${card.id}`}>
            <Button variant="ghost" size="icon">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
        ) : (
          <Button variant="ghost" size="icon" onClick={() => onView(card)}>
            <Eye className="h-4 w-4" />
          </Button>
        )}
        
        {onDelete && (
          <Button variant="ghost" size="icon" className="text-error" onClick={() => onDelete(card)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        
        {onUpdateValue && (
          <Button variant="ghost" size="icon" onClick={() => onUpdateValue(card)}>
            <Tag className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default CardItem;
