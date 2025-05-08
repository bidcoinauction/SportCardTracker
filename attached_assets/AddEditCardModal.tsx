import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { getRandomCardImage } from "@/lib/cardImages";
import { cleanCardNotes } from "@/lib/utils";
import { Card } from "@shared/schema";
import { insertCardSchema } from "@shared/schema";
import { sportOptions, conditionOptions } from "@shared/schema";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageIcon, Camera } from "lucide-react";
import CardRecognitionModal from "@/components/CardRecognitionModal";

// Extended schema for the form with validation
const formSchema = z.object({
  playerName: z.string().min(2, "Player name must be at least 2 characters"),
  sport: z.string().min(1, "Sport is required"),
  year: z.coerce.number().min(1900, "Year must be at least 1900").max(new Date().getFullYear(), "Year cannot be in the future"),
  brand: z.string().min(1, "Brand is required"),
  cardSet: z.string().optional(),
  condition: z.string().min(1, "Condition is required"),
  purchasePrice: z.coerce.number().min(0, "Price must be a positive number"),
  currentValue: z.coerce.number().min(0, "Value must be a positive number").optional(),
  notes: z.string().optional(),
  imageUrl: z.string().optional(),
  cardNumber: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddEditCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: Card | null;
  onSuccess: () => void;
}

export default function AddEditCardModal({ open, onOpenChange, card, onSuccess }: AddEditCardModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recognitionModalOpen, setRecognitionModalOpen] = useState(false);
  
  // Default values
  const defaultValues: FormValues = {
    playerName: "",
    sport: "baseball",
    year: new Date().getFullYear(),
    brand: "",
    cardSet: "",
    condition: "raw",
    purchasePrice: 0,
    currentValue: 0,
    notes: "",
    imageUrl: getRandomCardImage(), // Use a real card image as default
    cardNumber: "",
  };
  
  // Initialize the form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });
  
  // Update form when card changes
  useEffect(() => {
    if (card) {
      // Cast to properly handle types, Drizzle sometimes returns null for numeric fields with default values
      const purchasePrice = typeof card.purchasePrice === 'number' ? card.purchasePrice : 0;
      const currentValue = typeof card.currentValue === 'number' ? card.currentValue : 0;
      
      form.reset({
        playerName: card.playerName,
        sport: card.sport,
        year: card.year,
        brand: card.brand,
        cardSet: card.cardSet || "",
        condition: card.condition,
        purchasePrice,
        currentValue,
        notes: cleanCardNotes(card.notes || ""),
        imageUrl: card.imageUrl || getRandomCardImage(),
        cardNumber: card.cardNumber || "",
      });
    } else {
      form.reset(defaultValues);
    }
  }, [card, form]);
  
  const onSubmit = async (data: FormValues) => {
    try {
      setIsSubmitting(true);
      
      if (card) {
        // Update existing card
        await apiRequest("PATCH", `/api/cards/${card.id}`, data);
      } else {
        // Create new card
        await apiRequest("POST", "/api/cards", data);
      }
      
      // Close modal and notify success
      onOpenChange(false);
      form.reset(defaultValues);
      onSuccess();
    } catch (error) {
      console.error("Form submission error:", error);
      // Error handling is done in apiRequest
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle filling form with recognized card data
  const handleRecognitionSuccess = (recognizedCard: Partial<Card>) => {
    console.log("Card recognized:", recognizedCard);
    
    // Update form with recognized data, preserving existing values
    form.setValue('playerName', recognizedCard.playerName || form.getValues('playerName'));
    form.setValue('sport', recognizedCard.sport || form.getValues('sport'));
    form.setValue('year', recognizedCard.year || form.getValues('year'));
    form.setValue('brand', recognizedCard.brand || form.getValues('brand'));
    form.setValue('cardSet', recognizedCard.cardSet || form.getValues('cardSet'));
    form.setValue('cardNumber', recognizedCard.cardNumber || form.getValues('cardNumber'));
    form.setValue('condition', recognizedCard.condition || form.getValues('condition'));
    
    if (recognizedCard.notes) {
      form.setValue('notes', cleanCardNotes(recognizedCard.notes));
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{card ? "Edit Card" : "Add New Card"}</DialogTitle>
            <DialogDescription>
              {card 
                ? "Update the details for this trading card." 
                : "Enter the details for your new trading card."}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="playerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Player Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Mike Trout" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="sport"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sport</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Sport" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sportOptions.slice(1).map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label.replace('All ', '')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Topps, Panini" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="condition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Condition</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Condition" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {conditionOptions.slice(1).map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label.replace('All ', '')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="purchasePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchase Price</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500">$</span>
                          </div>
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="0.00" 
                            className="pl-7" 
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="cardSet"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Card Set (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Chrome, Prizm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="cardNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Card Number (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. MT-27, #42" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Card Image URL (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/card-image.jpg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Card Name</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter the name of this card as it appears on the front" 
                        rows={2}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="flex gap-2">
                {!card && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRecognitionModalOpen(true)}
                    className="mr-auto"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Auto-Identify Card
                  </Button>
                )}
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting 
                    ? (card ? 'Updating...' : 'Adding...') 
                    : (card ? 'Update Card' : 'Add Card')
                  }
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Card Recognition Modal */}
      <CardRecognitionModal
        open={recognitionModalOpen}
        onOpenChange={setRecognitionModalOpen}
        onRecognitionSuccess={handleRecognitionSuccess}
      />
    </>
  );
}