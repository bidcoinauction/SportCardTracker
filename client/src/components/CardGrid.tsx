import { Card } from "@shared/schema";
import CardItem from "./CardItem";
import { Skeleton } from "@/components/ui/skeleton";

type CardGridProps = {
  cards: Card[];
  isLoading?: boolean;
  onEdit?: (card: Card) => void;
  onView?: (card: Card) => void;
  onDelete?: (card: Card) => void;
  onUpdateValue?: (card: Card) => void;
};

const CardGrid = ({
  cards,
  isLoading = false,
  onEdit,
  onView,
  onDelete,
  onUpdateValue,
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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {cards.map((card) => (
        <CardItem
          key={card.id}
          card={card}
          onEdit={onEdit}
          onView={onView}
          onDelete={onDelete}
          onUpdateValue={onUpdateValue}
        />
      ))}
    </div>
  );
};

export default CardGrid;
