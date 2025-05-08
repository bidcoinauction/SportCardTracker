import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cardFormSchema, InsertCard } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ImagePlus, 
  Loader2,
  SaveIcon
} from "lucide-react";

type AddCardFormProps = {
  defaultValues?: Partial<InsertCard>;
  cardId?: number;
  isEdit?: boolean;
  onSuccess?: () => void;
};

const AddCardForm = ({ 
  defaultValues = {}, 
  cardId, 
  isEdit = false,
  onSuccess
}: AddCardFormProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, navigate] = useLocation();
  const [frontImagePreview, setFrontImagePreview] = useState<string | null>(defaultValues.frontImageUrl || null);
  const [backImagePreview, setBackImagePreview] = useState<string | null>(defaultValues.backImageUrl || null);
  const [frontImageFile, setFrontImageFile] = useState<File | null>(null);
  const [backImageFile, setBackImageFile] = useState<File | null>(null);

  const form = useForm<InsertCard>({
    resolver: zodResolver(cardFormSchema),
    defaultValues: {
      playerName: "",
      team: "",
      sport: "basketball",
      year: new Date().getFullYear(),
      brandSet: "",
      cardNumber: "",
      condition: "mint",
      grade: "",
      estimatedValue: 0,
      notes: "",
      ...defaultValues,
    },
  });

  const createCardMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest(
        isEdit ? "PUT" : "POST", 
        isEdit ? `/api/cards/${cardId}` : "/api/cards", 
        undefined,
        { body: data }
      );
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      if (cardId) {
        queryClient.invalidateQueries({ queryKey: ["/api/cards", cardId] });
      }
      
      toast({
        title: isEdit ? "Card Updated" : "Card Added",
        description: isEdit 
          ? `${data.playerName} card has been updated.` 
          : `${data.playerName} card has been added to your collection.`,
        variant: "success",
      });
      
      if (onSuccess) {
        onSuccess();
      } else {
        navigate(isEdit ? `/card/${cardId}` : "/collection");
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${isEdit ? "update" : "add"} card: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertCard) => {
    const formData = new FormData();
    
    // Append all the form fields
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });
    
    // Append the image files if they exist
    if (frontImageFile) {
      formData.append("frontImage", frontImageFile);
    }
    
    if (backImageFile) {
      formData.append("backImage", backImageFile);
    }
    
    createCardMutation.mutate(formData);
  };

  const handleFrontImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFrontImageFile(file);
      setFrontImagePreview(URL.createObjectURL(file));
    }
  };

  const handleBackImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBackImageFile(file);
      setBackImagePreview(URL.createObjectURL(file));
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="mb-4">
              <FormLabel className="block text-sm font-medium text-gray-700 mb-1">Card Images</FormLabel>
              <div className="flex space-x-2">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center flex-1 flex flex-col items-center justify-center hover:bg-gray-50 transition-colors duration-150 relative">
                  {frontImagePreview ? (
                    <div className="relative w-full h-32">
                      <img 
                        src={frontImagePreview} 
                        alt="Front of card" 
                        className="w-full h-full object-contain" 
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity">
                        <label className="cursor-pointer text-white p-2 rounded-full hover:bg-gray-700">
                          <ImagePlus className="h-6 w-6" />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFrontImageChange}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <ImagePlus className="h-10 w-10 text-gray-400 mb-2" />
                      <p className="text-xs text-gray-500">Upload Front Image</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFrontImageChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center flex-1 flex flex-col items-center justify-center hover:bg-gray-50 transition-colors duration-150 relative">
                  {backImagePreview ? (
                    <div className="relative w-full h-32">
                      <img 
                        src={backImagePreview} 
                        alt="Back of card" 
                        className="w-full h-full object-contain" 
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity">
                        <label className="cursor-pointer text-white p-2 rounded-full hover:bg-gray-700">
                          <ImagePlus className="h-6 w-6" />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleBackImageChange}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <ImagePlus className="h-10 w-10 text-gray-400 mb-2" />
                      <p className="text-xs text-gray-500">Upload Back Image</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleBackImageChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="sport"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>Sport</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Sport" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="basketball">Basketball</SelectItem>
                      <SelectItem value="baseball">Baseball</SelectItem>
                      <SelectItem value="football">Football</SelectItem>
                      <SelectItem value="hockey">Hockey</SelectItem>
                      <SelectItem value="soccer">Soccer</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="playerName"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>Player Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Michael Jordan" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="team"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>Team</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Chicago Bulls" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div>
            <FormField
              control={form.control}
              name="year"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>Year</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="e.g. 1996" 
                      {...field} 
                      onChange={(e) => field.onChange(parseInt(e.target.value) || "")} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="brandSet"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>Brand/Set</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Topps Chrome" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="cardNumber"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>Card Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. #23" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="mb-4 grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="condition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Condition</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Condition" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="mint">Mint</SelectItem>
                        <SelectItem value="nearMint">Near Mint</SelectItem>
                        <SelectItem value="excellent">Excellent</SelectItem>
                        <SelectItem value="veryGood">Very Good</SelectItem>
                        <SelectItem value="good">Good</SelectItem>
                        <SelectItem value="fair">Fair</SelectItem>
                        <SelectItem value="poor">Poor</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="grade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grade (if any)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Grade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Raw (No Grade)</SelectItem>
                        <SelectItem value="PSA 10">PSA 10</SelectItem>
                        <SelectItem value="PSA 9">PSA 9</SelectItem>
                        <SelectItem value="PSA 8">PSA 8</SelectItem>
                        <SelectItem value="BGS 9.5">BGS 9.5</SelectItem>
                        <SelectItem value="BGS 9">BGS 9</SelectItem>
                        <SelectItem value="SGC 10">SGC 10</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="estimatedValue"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>Estimated Value ($)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="e.g. 250" 
                      {...field} 
                      onChange={(e) => field.onChange(e.target.value === "" ? "" : Number(e.target.value))} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Add any additional details about this card..." 
                  className="h-20"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end space-x-3 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(isEdit ? `/card/${cardId}` : "/collection")}
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            disabled={createCardMutation.isPending}
          >
            {createCardMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEdit ? "Updating" : "Adding"} Card
              </>
            ) : (
              <>
                <SaveIcon className="mr-2 h-4 w-4" />
                {isEdit ? "Update" : "Add"} Card
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default AddCardForm;
