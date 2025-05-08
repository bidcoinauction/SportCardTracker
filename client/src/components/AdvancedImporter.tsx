import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { insertCardSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPrice } from "@/lib/utils";
import SuccessAnimation from "./SuccessAnimation";

interface AdvancedImporterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function AdvancedImporter({ open, onOpenChange, onSuccess }: AdvancedImporterProps) {
  const { toast } = useToast();
  const [jsonContent, setJsonContent] = useState<string>("");
  const [bulkText, setBulkText] = useState<string>("");
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [importedCards, setImportedCards] = useState<number>(0);
  const [previewData, setPreviewData] = useState<any[] | null>(null);

  const importJsonMutation = useMutation({
    mutationFn: async (data: any[]) => {
      return fetch('/api/cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cards: data }),
      }).then(res => {
        if (!res.ok) {
          throw new Error('Import failed');
        }
        return res.json();
      });
    },
    onSuccess: (data) => {
      setImportedCards(data.imported || data.length || 0);
      setShowSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['/api/cards'] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Import Failed",
        description: error.message || "There was a problem importing your cards.",
      });
    },
  });

  const bulkTextImportMutation = useMutation({
    mutationFn: async (data: string) => {
      return fetch('/api/import/text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: data }),
      }).then(res => {
        if (!res.ok) {
          throw new Error('Import failed');
        }
        return res.json();
      });
    },
    onSuccess: (data) => {
      setImportedCards(data.imported || 0);
      setShowSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['/api/cards'] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Import Failed",
        description: error.message || "There was a problem importing your cards.",
      });
    },
  });

  const handleJsonContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJsonContent(e.target.value);
    setPreviewData(null);
  };

  const handleBulkTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBulkText(e.target.value);
  };

  const previewJson = () => {
    try {
      const data = JSON.parse(jsonContent);
      if (Array.isArray(data) && data.length > 0) {
        setPreviewData(data.slice(0, 5)); // Show first 5 items for preview
      } else {
        throw new Error("Invalid data format. Expected array of cards.");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Invalid JSON",
        description: "The JSON data is not formatted correctly.",
      });
    }
  };

  const importJson = () => {
    try {
      const data = JSON.parse(jsonContent);
      if (Array.isArray(data) && data.length > 0) {
        importJsonMutation.mutate(data);
      } else {
        throw new Error("Invalid data format. Expected array of cards.");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Invalid JSON",
        description: "The JSON data is not formatted correctly.",
      });
    }
  };

  const importBulkText = () => {
    if (!bulkText.trim()) {
      toast({
        variant: "destructive",
        title: "Empty Input",
        description: "Please enter card data in the text area.",
      });
      return;
    }
    bulkTextImportMutation.mutate(bulkText);
  };

  if (showSuccess) {
    return (
      <SuccessAnimation 
        message={`Successfully imported ${importedCards} cards!`}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="json">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="json">JSON Import</TabsTrigger>
          <TabsTrigger value="text">Text Import</TabsTrigger>
        </TabsList>
        
        <TabsContent value="json" className="space-y-4">
          <div>
            <Label htmlFor="json-input">Paste JSON data</Label>
            <div className="mt-1">
              <Textarea
                id="json-input"
                placeholder={`[
  {
    "playerName": "Michael Jordan",
    "sport": "basketball",
    "year": 1996,
    "brand": "Fleer",
    "cardSet": "Ultra",
    "condition": "mint",
    "currentValue": 150
  },
  ...
]`}
                value={jsonContent}
                onChange={handleJsonContentChange}
                className="font-mono text-sm h-60"
              />
            </div>
          </div>
          
          {previewData && (
            <div className="border rounded-md p-4 mt-4">
              <h3 className="text-sm font-medium mb-2">Preview (first {previewData.length} cards):</h3>
              <div className="space-y-3">
                {previewData.map((card, index) => (
                  <div key={index} className="border-b pb-2 last:border-0 last:pb-0">
                    <div className="flex justify-between">
                      <span className="font-medium">{card.playerName || "Unknown Player"}</span>
                      <span className="text-green-600">{formatPrice(card.currentValue)}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {card.year} {card.brand} {card.cardSet} • {card.sport} • {card.condition}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex justify-between">
            <Button 
              variant="secondary" 
              onClick={previewJson}
              disabled={!jsonContent || importJsonMutation.isPending}
            >
              Preview Data
            </Button>
            <div className="space-x-2">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={importJsonMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                onClick={importJson} 
                disabled={!jsonContent || importJsonMutation.isPending}
              >
                {importJsonMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  "Import Cards"
                )}
              </Button>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="text" className="space-y-4">
          <div>
            <Label htmlFor="bulk-text-input">Paste Card Descriptions (one per line)</Label>
            <div className="mt-1">
              <Textarea
                id="bulk-text-input"
                placeholder="1996 Fleer Ultra Michael Jordan #23 PSA 10 Mint
2020 Panini Prizm Lebron James #6 Grade 9.5
..."
                value={bulkText}
                onChange={handleBulkTextChange}
                className="h-60"
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Our system will try to parse each line and extract card details. For best results, include player name, year, 
              brand, set, card number, and condition in each line.
            </p>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={bulkTextImportMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              onClick={importBulkText} 
              disabled={!bulkText || bulkTextImportMutation.isPending}
            >
              {bulkTextImportMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                "Import Cards"
              )}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}