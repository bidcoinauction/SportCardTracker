import { useState, useRef } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { getSportSpecificImage } from '@/lib/cardImages';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, FileImage, ImagePlus, Undo2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CardRecognitionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecognitionSuccess: (cardData: Partial<Card>) => void;
}

type FormValues = {
  image: FileList | null;
};

interface RecognitionResponse {
  message: string;
  card: Partial<Card>;
}

export default function CardRecognitionModal({
  open,
  onOpenChange,
  onRecognitionSuccess,
}: CardRecognitionModalProps) {
  const { toast } = useToast();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const form = useForm<FormValues>({
    defaultValues: {
      image: null,
    },
    resolver: zodResolver(
      z.object({
        image: z
          .instanceof(FileList)
          .refine((files) => files.length === 1, 'Please select an image')
          .refine(
            (files) => 
              ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(files[0]?.type),
            'File must be an image (JPEG, PNG, GIF, or WEBP)'
          )
          .refine(
            (files) => files[0]?.size <= 5 * 1024 * 1024,
            'Image must be less than 5MB'
          ),
      })
    ),
  });

  const recognizeCardMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      // Use fetch directly for FormData since apiRequest assumes JSON
      const response = await fetch('/api/recognize-card', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw { status: response.status, data: errorData };
      }
      
      return await response.json() as RecognitionResponse;
    },
    onSuccess: (data) => {
      onRecognitionSuccess(data.card);
      toast({
        title: 'Card recognized!',
        description: 'The card details have been automatically filled in.',
      });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      console.error('Error recognizing card:', error);
      if (error.data?.partialData) {
        // We have partial data, let the user continue with it
        toast({
          title: 'Partial recognition',
          description: 'Some card details were recognized. You can fill in the rest manually.',
          variant: 'destructive',
        });
        onRecognitionSuccess(error.data.partialData);
        onOpenChange(false);
        resetForm();
      } else {
        setRecognitionError(
          error.data?.message || 'Failed to recognize card. Please try another image or enter details manually.'
        );
      }
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    // Create a preview URL for the image
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setRecognitionError(null);
    
    // Update form
    form.setValue('image', e.target.files);
  };

  const resetForm = () => {
    form.reset();
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setRecognitionError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onSubmit = async (data: FormValues) => {
    if (!data.image?.[0]) return;

    const formData = new FormData();
    formData.append('image', data.image[0]);

    recognizeCardMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Card Recognition</DialogTitle>
          <DialogDescription>
            Upload a card image to automatically identify and fill in the details.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="image"
              render={({ field: { onChange, value, ...fieldProps } }) => (
                <FormItem>
                  <FormLabel className="text-base">Card Image</FormLabel>
                  <FormControl>
                    <>
                      <Input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={handleFileChange}
                        className={previewUrl ? 'hidden' : ''}
                        {...fieldProps}
                        ref={fileInputRef}
                      />
                      {previewUrl && (
                        <div className="relative mt-2 rounded-lg overflow-hidden border border-border">
                          <img
                            src={previewUrl}
                            alt="Card preview"
                            className="w-full h-auto max-h-[300px] object-contain"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="absolute bottom-2 right-2 bg-background/80"
                            onClick={() => {
                              resetForm();
                            }}
                          >
                            <Undo2 className="mr-1 h-4 w-4" />
                            Change
                          </Button>
                        </div>
                      )}
                      {!previewUrl && (
                        <div
                          className="mt-2 border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center cursor-pointer hover:bg-accent/50 transition-colors"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <FileImage className="mx-auto h-12 w-12 text-muted-foreground" />
                          <div className="mt-4 flex text-sm leading-6 text-muted-foreground">
                            <label
                              htmlFor="file-upload"
                              className="relative cursor-pointer rounded-md bg-background font-semibold text-primary focus-within:outline-none focus-within:ring-2 focus-within:ring-primary"
                            >
                              <span>Upload a card image</span>
                            </label>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            PNG, JPG, GIF or WEBP up to 5MB
                          </p>
                        </div>
                      )}
                    </>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {recognitionError && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{recognitionError}</AlertDescription>
              </Alert>
            )}

            <DialogFooter className="mt-6 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!previewUrl || recognizeCardMutation.isPending}
                className="gap-2"
              >
                {recognizeCardMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="h-4 w-4" />
                )}
                Identify Card
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}