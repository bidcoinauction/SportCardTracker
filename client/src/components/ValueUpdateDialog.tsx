import { useState } from "react";
import { Card } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
import { Loader2, DollarSign, Sparkles } from "lucide-react";

type ValueUpdateDialogProps = {
  card: Card;
  open: boolean;
  onClose: () => void;
};

const ValueUpdateDialog = ({ card, open, onClose }: ValueUpdateDialogProps) => {
  const [newValue, setNewValue] = useState(card.estimatedValue.toString());
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Calculate suggested values (5%, 10%, and 15% increase/decrease)
  const currentValue = Number(card.estimatedValue);
  const suggestedValues = [
    { label: "-15%", value: Math.round(currentValue * 0.85) },
    { label: "-10%", value: Math.round(currentValue * 0.9) },
    { label: "-5%", value: Math.round(currentValue * 0.95) },
    { label: "+5%", value: Math.round(currentValue * 1.05) },
    { label: "+10%", value: Math.round(currentValue * 1.1) },
    { label: "+15%", value: Math.round(currentValue * 1.15) },
  ];

  // Update value mutation
  const updateValueMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", `/api/cards/${card.id}`, {
        estimatedValue: Number(newValue)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cards", card.id] });
      
      toast({
        title: "Value Updated",
        description: `${card.playerName} card value has been updated to $${Number(newValue).toLocaleString()}.`,
      });
      
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update value: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewValue(e.target.value);
  };

  const handleValueSelect = (value: number) => {
    setNewValue(value.toString());
  };

  const handleSubmit = () => {
    updateValueMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Card Value</DialogTitle>
          <DialogDescription>
            Update the estimated value for {card.playerName} ({card.year} {card.brandSet})
          </DialogDescription>
        </DialogHeader>
        
        <div className="my-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center flex-1">
              <span className="text-lg font-medium">$</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={newValue}
                onChange={handleValueChange}
                placeholder={card.estimatedValue.toString()}
              />
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center mb-2">
              <Sparkles className="h-4 w-4 mr-2 text-primary" />
              <span className="text-sm font-medium">Suggested Values</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {suggestedValues.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className={suggestion.label.startsWith("+") ? "text-success" : "text-error"}
                  onClick={() => handleValueSelect(suggestion.value)}
                >
                  {suggestion.label} (${suggestion.value})
                </Button>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded-md">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Current Value:</span>
              <span className="font-medium">${Number(card.estimatedValue).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm mt-1">
              <span className="text-gray-600">New Value:</span>
              <span className="font-medium">${Number(newValue || 0).toLocaleString()}</span>
            </div>
            {newValue !== card.estimatedValue.toString() && (
              <div className="flex justify-between items-center text-sm mt-1">
                <span className="text-gray-600">Change:</span>
                <span className={`font-medium ${Number(newValue) > Number(card.estimatedValue) ? 'text-success' : 'text-error'}`}>
                  {Number(newValue) > Number(card.estimatedValue) ? '+' : ''}
                  ${(Number(newValue) - Number(card.estimatedValue)).toLocaleString()} 
                  ({((Number(newValue) - Number(card.estimatedValue)) / Number(card.estimatedValue) * 100).toFixed(1)}%)
                </span>
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={updateValueMutation.isPending || newValue === card.estimatedValue.toString() || !newValue}
          >
            {updateValueMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <DollarSign className="mr-2 h-4 w-4" />
                Update Value
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ValueUpdateDialog;
