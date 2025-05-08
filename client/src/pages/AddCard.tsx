import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import AddCardForm from "@/components/AddCardForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const AddCard = () => {
  const [, navigate] = useLocation();
  const search = useSearch();
  const [editCardId, setEditCardId] = useState<number | null>(null);

  // Parse URL parameters for edit mode
  useEffect(() => {
    const params = new URLSearchParams(search);
    const editId = params.get("edit");
    
    if (editId) {
      const id = parseInt(editId);
      if (!isNaN(id)) {
        setEditCardId(id);
      }
    }
  }, [search]);

  // Fetch card data if in edit mode
  const { data: card, isLoading } = useQuery({
    queryKey: ["/api/cards", editCardId],
    enabled: editCardId !== null,
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          {editCardId ? "Edit Card" : "Add New Card"}
        </h2>
        <p className="text-gray-600">
          {editCardId 
            ? "Update the details of your sports card" 
            : "Add a new sports card to your collection"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {editCardId ? "Edit Card Details" : "Card Details"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editCardId && isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-gray-600">Loading card data...</span>
            </div>
          ) : (
            <AddCardForm 
              defaultValues={card} 
              cardId={editCardId || undefined}
              isEdit={!!editCardId}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AddCard;
