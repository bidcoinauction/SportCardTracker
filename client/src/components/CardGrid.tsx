import { Card } from "@shared/schema";
import CardItem from "./CardItem";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Edit, Search, Tag, Trash2 } from "lucide-react";

type CardGridProps = {
  cards: Card[];
  isLoading?: boolean;
  viewMode?: "grid" | "list";
  onEdit?: (card: Card) => void;
  onView?: (card: Card) => void;
  onDelete?: (card: Card) => void;
  onUpdateValue?: (card: Card) => void;
  onResearch?: (card: Card) => void;
};

const CardGrid = ({
  cards,
  isLoading = false,
  viewMode = "grid",
  onEdit,
  onView,
  onDelete,
  onUpdateValue,
  onResearch,
}: CardGridProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array(4)
          .fill(0)
          .map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow overflow-hidden">
              <Skeleton className="w-full h-48" />
              <div className="p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Skeleton className="h-5 w-12 rounded-full mr-1" />
                    <Skeleton className="h-5 w-12 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <div className="border-t border-gray-100 px-4 py-2 flex justify-between">
                <Skeleton className="h-6 w-6" />
                <Skeleton className="h-6 w-6" />
                <Skeleton className="h-6 w-6" />
                <Skeleton className="h-6 w-6" />
              </div>
            </div>
          ))}
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-10 text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">No cards found</h3>
        <p className="text-gray-500">Try adjusting your filters or add a new card.</p>
      </div>
    );
  }

  // Render list view as a table for better data display
  if (viewMode === "list") {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 border-b">Image</th>
                <th className="px-4 py-3 border-b">Player Name</th>
                <th className="px-4 py-3 border-b">Set</th>
                <th className="px-4 py-3 border-b">Year</th>
                <th className="px-4 py-3 border-b">Condition</th>
                <th className="px-4 py-3 border-b whitespace-nowrap">Card Number</th>
                <th className="px-4 py-3 border-b">Value</th>
                <th className="px-4 py-3 border-b text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {cards.map((card) => (
                <tr key={card.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 w-16">
                    <div className="w-12 h-12 relative">
                      <img
                        src={card.frontImageUrl || "https://via.placeholder.com/48x48?text=No+Image"}
                        alt={`${card.playerName} card`}
                        className="w-12 h-12 object-cover rounded"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = `https://via.placeholder.com/48x48/f5f5f5/666666?text=${encodeURIComponent(card.playerName?.substring(0, 2) || 'SC')}`;
                        }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{card.playerName}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {card.brand} {card.cardSet}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{card.year}</td>
                  <td className="px-4 py-3 text-gray-600">
                    <span className="px-2 py-1 text-xs rounded-full bg-gray-100">
                      {card.condition}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {card.cardNumber ? `#${card.cardNumber}` : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-accent-foreground">
                      ${typeof card.currentValue === 'number' 
                        ? card.currentValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) 
                        : (card.currentValue || '0.00')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                    {onResearch && (
                      <Button variant="ghost" size="sm" onClick={() => onResearch(card)} title="Research price">
                        <Search className="h-4 w-4" />
                      </Button>
                    )}
                    {onUpdateValue && (
                      <Button variant="ghost" size="sm" onClick={() => onUpdateValue(card)} title="Update value">
                        <Tag className="h-4 w-4" />
                      </Button>
                    )}
                    {onEdit && (
                      <Button variant="ghost" size="sm" onClick={() => onEdit(card)} title="Edit card">
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button variant="ghost" size="sm" className="text-error" onClick={() => onDelete(card)} title="Delete card">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Grid view (default)
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {cards.map((card) => (
        <CardItem
          key={card.id}
          card={card}
          viewMode="grid"
          onEdit={onEdit ? () => onEdit(card) : undefined}
          onView={onView ? () => onView(card) : undefined}
          onDelete={onDelete ? () => onDelete(card) : undefined}
          onUpdateValue={onUpdateValue ? () => onUpdateValue(card) : undefined}
          onResearch={onResearch ? () => onResearch(card) : undefined}
        />
      ))}
    </div>
  );
};

export default CardGrid;
