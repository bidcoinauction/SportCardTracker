import { Card } from "@shared/schema";
import CardItem from "./CardItem";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useState, useMemo } from "react";

interface CardGridProps {
  cards: Card[];
  isLoading: boolean;
  viewMode: "grid" | "list";
  onEdit: (card: Card) => void;
  onDelete: (card: Card) => void;
  onResearch?: (card: Card) => void;
}

export default function CardGrid({ cards, isLoading, viewMode, onEdit, onDelete, onResearch }: CardGridProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  
  // Calculate pagination
  const totalPages = Math.ceil(cards.length / itemsPerPage);
  
  // Get current page items
  const currentItems = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return cards.slice(indexOfFirstItem, indexOfLastItem);
  }, [cards, currentPage, itemsPerPage]);
  
  // Change page
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Loading cards...</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
              <Skeleton className="h-56 w-full" />
              <div className="p-3">
                <Skeleton className="h-6 w-2/3 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-4" />
                <div className="flex justify-between">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  if (cards.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Your Cards (0)</h3>
        </div>
        
        <div className="p-8 text-center">
          <svg 
            className="mx-auto h-12 w-12 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1.5} 
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" 
            />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">No cards found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Add your first card or import your collection to get started
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">Your Cards ({cards.length})</h3>
        <span className="text-sm text-gray-600">
          Showing {Math.min((currentPage - 1) * itemsPerPage + 1, cards.length)}-
          {Math.min(currentPage * itemsPerPage, cards.length)} of {cards.length} cards
        </span>
      </div>
      
      {/* Card Grid */}
      <div className={viewMode === "grid" 
        ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4"
        : "divide-y divide-gray-200"
      }>
        {currentItems.map(card => (
          <CardItem 
            key={card.id} 
            card={card} 
            viewMode={viewMode}
            onEdit={() => onEdit(card)}
            onDelete={() => onDelete(card)}
            onResearch={() => onResearch?.(card)}
          />
        ))}
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{Math.min((currentPage - 1) * itemsPerPage + 1, cards.length)}</span> to{" "}
                <span className="font-medium">{Math.min(currentPage * itemsPerPage, cards.length)}</span> of{" "}
                <span className="font-medium">{cards.length}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <Button
                  variant="outline"
                  size="sm"
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <span className="sr-only">Previous</span>
                  <ChevronLeftIcon className="h-5 w-5" />
                </Button>
                
                {/* Page buttons */}
                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  if (pageNum > totalPages) return null;
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "secondary" : "outline"}
                      size="sm"
                      className={`relative inline-flex items-center px-4 py-2 border ${
                        currentPage === pageNum 
                          ? "bg-blue-50 text-blue-600" 
                          : "bg-white text-gray-700"
                      }`}
                      onClick={() => paginate(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                
                {/* Show ellipsis if there are more pages */}
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                    ...
                  </span>
                )}
                
                {/* Always show last page if not already included */}
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <Button
                    variant={currentPage === totalPages ? "secondary" : "outline"}
                    size="sm"
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                    onClick={() => paginate(totalPages)}
                  >
                    {totalPages}
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  <span className="sr-only">Next</span>
                  <ChevronRightIcon className="h-5 w-5" />
                </Button>
              </nav>
            </div>
          </div>
          <div className="flex sm:hidden justify-between w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
