import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Card, cardFormSchema, sportEnum, conditionEnum, InsertCard } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import SuccessAnimation from "./SuccessAnimation";

type FormValues = z.infer<typeof cardFormSchema>;

interface AddEditCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: Card | null;
  onSuccess: () => void;
}

export default function AddEditCardModal({ open, onOpenChange, card, onSuccess }: AddEditCardModalProps) {
  const { toast } = useToast();
  const [showSuccess, setShowSuccess] = useState(false);
  const isEditMode = !!card;

  // Default values for the form
  const defaultValues: Partial<FormValues> = {
    playerName: card?.playerName || "",
    sport: (card?.sport as any) || "basketball",
    year: card?.year || new Date().getFullYear(),
    brand: card?.brand || "",
    cardSet: card?.cardSet || "",
    cardNumber: card?.cardNumber || "",
    condition: (card?.condition as any) || "nearMint",
    purchasePrice: card?.purchasePrice || "",
    currentValue: card?.currentValue?.toString() || "",
    team: card?.team || "",
    notes: card?.notes || "",
    frontImageUrl: card?.frontImageUrl || "",
    backImageUrl: card?.backImageUrl || "",
  };

  // Form setup with validation
  const form = useForm<FormValues>({
    resolver: zodResolver(cardFormSchema),
    defaultValues,
  });

  // Create card mutation
  const createCardMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const response = await fetch('/api/cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create card");
      }
      
      return response.json();
    },
    onSuccess: () => {
      setShowSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['/api/cards'] });
      
      // Reset form after successful creation
      setTimeout(() => {
        form.reset();
        onSuccess();
      }, 2000);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to create card",
        description: error.message,
      });
    },
  });

  // Update card mutation
  const updateCardMutation = useMutation({
    mutationFn: async (data: { id: number; formData: FormValues }) => {
      const response = await fetch(`/api/cards/${data.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data.formData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update card");
      }
      
      return response.json();
    },
    onSuccess: () => {
      setShowSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['/api/cards'] });
      
      // Close dialog after successful update
      setTimeout(() => {
        onSuccess();
      }, 2000);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to update card",
        description: error.message,
      });
    },
  });

  // Form submission handler
  const onSubmit = (data: FormValues) => {
    // Convert string values to numbers where needed
    const formattedData = {
      ...data,
      year: Number(data.year),
      currentValue: data.currentValue ? Number(data.currentValue) : undefined,
    };
    
    if (isEditMode && card) {
      updateCardMutation.mutate({ id: card.id, formData: formattedData });
    } else {
      createCardMutation.mutate(formattedData);
    }
  };

  if (showSuccess) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <SuccessAnimation 
            message={isEditMode ? "Card updated successfully!" : "Card added successfully!"}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Card" : "Add New Card"}</DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? "Update the details of your sports card."
              : "Enter the details of your sports card to add it to your collection."
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="images">Images</TabsTrigger>
              </TabsList>
              
              {/* Basic Info Tab */}
              <TabsContent value="basic" className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="playerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Player Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. LeBron James" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="sport"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sport</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select sport" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {sportEnum.options.map((sport) => (
                              <SelectItem key={sport} value={sport}>
                                {sport.charAt(0).toUpperCase() + sport.slice(1)}
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
                    name="team"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Team</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Los Angeles Lakers" {...field} />
                        </FormControl>
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
                          <Input 
                            type="number" 
                            placeholder={new Date().getFullYear().toString()}
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : '')}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="condition"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Condition</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select condition" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {conditionEnum.options.map((condition) => (
                              <SelectItem key={condition} value={condition}>
                                {condition === 'mint' ? 'Mint' :
                                 condition === 'nearMint' ? 'Near Mint' :
                                 condition === 'excellent' ? 'Excellent' :
                                 condition === 'veryGood' ? 'Very Good' :
                                 condition === 'good' ? 'Good' :
                                 condition === 'fair' ? 'Fair' :
                                 condition === 'poor' ? 'Poor' : 'Unknown'}
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
                    name="currentValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Value ($)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            step="0.01" 
                            min="0"
                            placeholder="0.00"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="purchasePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purchase Price ($)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            step="0.01" 
                            min="0"
                            placeholder="0.00"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
              
              {/* Details Tab */}
              <TabsContent value="details" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
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
                  
                  <FormField
                    control={form.control}
                    name="cardSet"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Set</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Chrome, Prizm" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="cardNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Card Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 23, RC-5" {...field} />
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
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Any additional notes about this card..."
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              {/* Images Tab */}
              <TabsContent value="images" className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="frontImageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Front Image URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/card-front.jpg" {...field} />
                      </FormControl>
                      <FormDescription>
                        Provide a URL to the front image of your card
                      </FormDescription>
                      <FormMessage />
                      {field.value && (
                        <div className="mt-2 aspect-[3/4] w-40 bg-gray-100 rounded-md overflow-hidden">
                          <img 
                            src={field.value} 
                            alt="Card Front" 
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = 'https://via.placeholder.com/300x400?text=Invalid+URL';
                            }}
                          />
                        </div>
                      )}
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="backImageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Back Image URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/card-back.jpg" {...field} />
                      </FormControl>
                      <FormDescription>
                        Provide a URL to the back image of your card
                      </FormDescription>
                      <FormMessage />
                      {field.value && (
                        <div className="mt-2 aspect-[3/4] w-40 bg-gray-100 rounded-md overflow-hidden">
                          <img 
                            src={field.value} 
                            alt="Card Back" 
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = 'https://via.placeholder.com/300x400?text=Invalid+URL';
                            }}
                          />
                        </div>
                      )}
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>
            
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createCardMutation.isPending || updateCardMutation.isPending}
              >
                {(createCardMutation.isPending || updateCardMutation.isPending) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditMode ? "Updating..." : "Adding..."}
                  </>
                ) : (
                  isEditMode ? "Update Card" : "Add Card"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}