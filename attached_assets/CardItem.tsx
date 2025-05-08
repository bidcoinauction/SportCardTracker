import { Card } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { formatPrice, getSportBadgeColor, cleanCardNotes } from "@/lib/utils";
import { getRandomCardImage, getSportSpecificImage } from "@/lib/cardImages";
import { PencilIcon, TrashIcon, BarChart2Icon } from "lucide-react";
import { useState } from "react";

interface CardItemProps {
  card: Card;
  viewMode: "grid" | "list";
  onEdit: () => void;
  onDelete: () => void;
  onResearch: () => void;
}

export default function CardItem({ card, viewMode, onEdit, onDelete, onResearch }: CardItemProps) {
  const sportBadgeColor = getSportBadgeColor(card.sport);
  const [imageError, setImageError] = useState(false);
  
  // Process image URL - handle multiple URLs separated by |
  const processImageUrl = (url: string) => {
    if (!url) return "";
    // If the URL contains a separator |, take the first URL
    if (url.includes("|")) {
      return url.split("|")[0].trim();
    }
    return url;
  };
  
  // Get appropriate card image - prefer imageUrl, fallback to sport-specific image, then random
  // Process player name to remove any card suffixes like "Topps cardSoccer"
  const cleanPlayerName = card.playerName
    .replace(/\s+(Topps|Panini)\s+card(Soccer|Basketball|Baseball|Football|Hockey)?$/i, "")
    .replace(/\s+(card)(Soccer|Basketball|Baseball|Football|Hockey)?$/i, "");
  
  // Fix duplicated brand names like "Topps Topps" or "2023 Topps 2024 Topps"
  let cleanBrand = card.brand
    .replace(/^(Topps|Panini)\s+\1$/i, "$1")
    .replace(/^\d{4}\s+(Topps|Panini)\s+\d{4}\s+\1$/i, "$1");
  
  const fallbackImage = getSportSpecificImage(card.sport) || getRandomCardImage();
  const processedImageUrl = card.imageUrl ? processImageUrl(card.imageUrl) : "";
  const cardImage = !imageError && processedImageUrl ? processedImageUrl : fallbackImage;
  
  if (viewMode === "list") {
    return (
      <div className="py-4 px-6 flex items-center">
        <div className="w-20 h-28 bg-gray-100 rounded overflow-hidden flex-shrink-0">
          <img 
            src={cardImage} 
            alt={`${card.playerName} ${card.brand} card`} 
            className="w-full h-full object-contain"
            onError={() => setImageError(true)}
          />
        </div>
        <div className="ml-4 flex-1">
          <div>
            <h3 className="font-semibold text-gray-900">{cleanPlayerName}</h3>
            <p className="text-sm text-gray-600">{card.year} {cleanBrand} {card.cardSet}</p>
            {card.notes && <p className="text-sm font-medium text-blue-600 mt-1">{cleanCardNotes(card.notes)}</p>}
          </div>
          
          <div className="grid grid-cols-4 gap-4 mt-2">
            <div>
              <span className="text-xs text-gray-500">Cost:</span>
              <div className="text-sm font-medium text-gray-700">{formatPrice(card.purchasePrice)}</div>
            </div>
            
            {(card.currentValue || 0) > 0 && (
              <div>
                <span className="text-xs text-gray-500">Market:</span>
                <div className="text-sm font-medium text-green-600">{formatPrice(card.currentValue)}</div>
              </div>
            )}
            
            <div>
              <span className="text-xs text-gray-500">Condition:</span>
              <div className="text-sm">{card.condition}</div>
            </div>
            
            <div>
              <span className="text-xs text-gray-500">ID:</span>
              <div className="text-sm">{card.id}</div>
            </div>
          </div>
        </div>
        
        <div className={`px-2 py-1 rounded ${sportBadgeColor} text-white mx-2`}>
          {card.sport}
        </div>
        
        <div className="flex items-center space-x-2 min-w-[240px]">
          <Button variant="outline" size="sm" onClick={onResearch} className="flex-1 text-purple-600 border-purple-200 hover:bg-purple-50 hover:text-purple-700">
            <BarChart2Icon className="h-4 w-4 mr-1" />
            Price
          </Button>
          <Button variant="outline" size="sm" onClick={onEdit} className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700">
            <PencilIcon className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete} className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700">
            <TrashIcon className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="bg-gray-100 relative h-56 overflow-hidden">
        <img 
          src={cardImage} 
          alt={`${card.playerName} ${card.brand} card`} 
          className="object-contain w-full h-full"
          onError={() => setImageError(true)}
        />
        <div className={`absolute top-2 right-2 ${sportBadgeColor} text-white text-xs px-2 py-1 rounded`}>
          {card.sport}
        </div>
      </div>
      <div className="p-3">
        <div>
          <h3 className="font-semibold text-gray-900 text-center">{cleanPlayerName}</h3>
          <p className="text-sm text-gray-600 text-center">{card.year} {cleanBrand} {card.cardSet}</p>
          
          {/* Display cleaned up notes as card name */}
          {card.notes && 
            <p className="text-sm font-medium text-blue-600 mt-1 mb-2 text-center">
              {cleanCardNotes(card.notes)}
            </p>}
        </div>
        
        <div className="flex justify-between mt-2 items-center">
          <div className="flex flex-col">
            <span className="text-xs text-gray-500">Cost:</span>
            <span className="text-sm font-medium text-gray-700">{formatPrice(card.purchasePrice)}</span>
          </div>
          
          {(card.currentValue || 0) > 0 && (
            <div className="flex flex-col">
              <span className="text-xs text-gray-500">Market:</span>
              <span className="text-sm font-medium text-green-600">{formatPrice(card.currentValue)}</span>
            </div>
          )}
          
          <div className="flex flex-col">
            <span className="text-xs text-gray-500">Condition:</span>
            <span className="text-sm">{card.condition}</span>
          </div>
        </div>
        
        <div className="text-xs text-gray-500 mt-2 flex items-center justify-between">
          <span>ID: {card.id}</span>
          {card.cardNumber && <span>#{card.cardNumber}</span>}
        </div>
        
        <div className="flex justify-between mt-3 space-x-2">
          <Button variant="outline" size="sm" onClick={onResearch} className="flex-1 text-purple-600 border-purple-200 hover:bg-purple-50 hover:text-purple-700">
            <BarChart2Icon className="h-4 w-4 mr-1" />
            Price
          </Button>
          <Button variant="outline" size="sm" onClick={onEdit} className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700">
            <PencilIcon className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete} className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700">
            <TrashIcon className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
