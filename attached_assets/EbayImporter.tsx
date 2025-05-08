import { useState } from "react";
import { parse } from "csv-parse/browser/esm";
import { Check, AlertTriangle, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";

interface EbayImporterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface EbayCardRow {
  Action: string;
  CustomLabel: string;
  Category: string;
  StoreCategory: string;
  Title: string;
  Subtitle: string;
  ConditionID: string;
  ConditionDescription: string;
  "C:Player/Athlete": string;
  "C:Sport": string;
  "C:Year Manufactured": string;
  "C:Manufacturer": string;
  "C:Set": string;
  "C:Card Number": string;
  "C:Features": string;
  "C:Team": string;
  "C:Card Name": string;
  "C:Season": string;
  "C:League": string;
  "C:ConditionDescription": string;
  PicURL: string;
  Description: string;
}

export default function EbayImporter({ open, onOpenChange, onSuccess }: EbayImporterProps) {
  const { toast } = useToast();
  const [fileSelected, setFileSelected] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importedCards, setImportedCards] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [totalCards, setTotalCards] = useState(0);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFileSelected(e.target.files[0]);
    }
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFileSelected(e.dataTransfer.files[0]);
    }
  };

  const extractPlayerFromTitle = (title: string): string => {
    if (!title) return "";
    
    // Extract player name from title formats like "2024 Topps Finest MLS 101 Cristian Arango Aqua Refractor"
    const titleParts = title.split(" ");
    if (titleParts.length >= 6) {
      // Try to find the player name by looking for common patterns
      let startIndex = -1;
      
      // Look for a card number (usually all digits)
      for (let i = 0; i < titleParts.length; i++) {
        if (/^\d+$/.test(titleParts[i]) && i < titleParts.length - 2) {
          startIndex = i + 1;
          break;
        }
      }
      
      // If we found a likely player name starting position
      if (startIndex !== -1) {
        // Extract up to 2-3 words for player name, stopping at known parallels
        const stopWords = ["refractor", "auto", "autograph", "parallel", "insert", "prizm", "optic"];
        let playerName = "";
        
        for (let i = startIndex; i < Math.min(startIndex + 3, titleParts.length); i++) {
          if (stopWords.includes(titleParts[i].toLowerCase())) {
            break;
          }
          playerName += (playerName ? " " : "") + titleParts[i];
        }
        
        return playerName;
      }
    }
    
    // Default to returning the title if we can't extract a player name
    return title;
  };
  
  const extractImageUrl = (text: string): string | undefined => {
    // First, try to find URLs with 'oortstorages.com' in PicURL field
    if (text && text.includes("oortstorages.com")) {
      const urls = text.split("|").map(url => url.trim());
      return urls[0]; // Return the first URL
    }
    
    // If no URLs found, check Description field for image links
    if (text && text.includes("<img src=")) {
      const regex = /<img src="([^"]+)"/g;
      const matches: RegExpExecArray[] = [];
      let match;
      while ((match = regex.exec(text)) !== null) {
        matches.push(match);
      }
      
      for (const match of matches) {
        if (match[1] && match[1].includes("oortstorages.com")) {
          return match[1];
        }
      }
    }
    
    return undefined;
  };

  const normalizeCondition = (condition: string): string => {
    condition = condition.toLowerCase();
    
    if (condition.includes("mint") || condition.includes("nm")) {
      return "mint";
    } else if (condition.includes("excellent") || condition.includes("ex")) {
      return "excellent";
    } else if (condition.includes("very good") || condition.includes("vg")) {
      return "very good";
    } else if (condition.includes("good") || condition.includes("g")) {
      return "good";
    } else if (condition.includes("fair") || condition.includes("poor")) {
      return "fair";
    } else {
      return "raw"; // Default condition
    }
  };

  // Clean up notes that might contain another card's description
  const cleanupNotes = (notes: string = ""): string => {
    if (!notes) return "";
    
    // If notes contains another card description (like "Panini Select Premier League X"), it's likely incorrect
    if (notes.includes("Panini Select Premier League") || 
        notes.includes("Topps Merlin") || 
        notes.includes("Red Ice")) {
      
      // Try to extract just the features, not another card's full description
      const parts = notes.split(/\s+\d{4}-\d{2}/); // Split at year patterns like 2023-24
      if (parts.length > 0) {
        return parts[0].trim();
      }
      return ""; // If we can't clean it, return empty string
    }
    return notes;
  };

  const extractPrice = (description: string): number => {
    // Try to extract price from auction or fixed price text
    if (description) {
      const auctionMatch = description.match(/Starting at: \$([0-9.]+)/);
      const fixedPriceMatch = description.match(/Fixed Price(?:\s+Auction)?: \$([0-9.]+)/);
      
      if (fixedPriceMatch && fixedPriceMatch[1]) {
        return parseFloat(fixedPriceMatch[1]);
      } else if (auctionMatch && auctionMatch[1]) {
        return parseFloat(auctionMatch[1]);
      }
    }
    
    return 0; // Default price if not found
  };

  const importCsvData = async () => {
    if (!fileSelected) return;
    
    setIsImporting(true);
    setImportProgress(0);
    setImportedCards(0);
    setErrorCount(0);
    
    try {
      const fileContent = await fileSelected.text();
      
      // Parse CSV data
      parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ',',
        skip_records_with_error: true
      }, async (err, records: EbayCardRow[]) => {
        if (err) {
          console.error("CSV parsing error:", err);
          toast({
            title: "Error parsing CSV file",
            description: "There was an error parsing the CSV file. Please check the format.",
            variant: "destructive",
          });
          setIsImporting(false);
          return;
        }
        
        // Exclude the info row and header row
        const filteredRecords = records.filter(row => row.Action && row.Action.startsWith("Add"));
        setTotalCards(filteredRecords.length);
        
        let successCount = 0;
        let errors = 0;
        
        // Process each record
        for (let i = 0; i < filteredRecords.length; i++) {
          const row = filteredRecords[i];
          try {
            // Extract player name from different possible fields
            const playerName = row["C:Player/Athlete"] || extractPlayerFromTitle(row.Title);
            
            // Extract card data
            const cardData = {
              playerName: playerName,
              sport: row["C:Sport"]?.toLowerCase() || "unknown",
              year: parseInt(row["C:Year Manufactured"]) || new Date().getFullYear(),
              brand: row["C:Manufacturer"] || "",
              cardSet: row["C:Set"] || "",
              cardNumber: row["C:Card Number"] || "",
              condition: normalizeCondition(row["C:ConditionDescription"] || row.ConditionDescription),
              purchasePrice: extractPrice(row.Description),
              currentValue: 0, // To be updated later with eBay API
              notes: cleanupNotes(row["C:Features"] || row["C:Card Name"] || row.Subtitle || ""),
              imageUrl: extractImageUrl(row.PicURL || row.Description),
              team: row["C:Team"] || ""
            };
            
            // Skip records without a player name
            if (!cardData.playerName || cardData.playerName === "") {
              errors++;
              continue;
            }
            
            // Create the card in the database
            await fetch("/api/cards", {
              method: "POST",
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(cardData)
            });
            
            successCount++;
          } catch (error) {
            console.error("Error importing card:", error);
            errors++;
          }
          
          // Update progress
          setImportedCards(successCount);
          setErrorCount(errors);
          setImportProgress(Math.round(((i + 1) / filteredRecords.length) * 100));
        }
        
        // Import complete
        if (successCount > 0) {
          queryClient.invalidateQueries({ queryKey: ['/api/cards'] });
          toast({
            title: "Import complete",
            description: `Successfully imported ${successCount} cards. ${errors > 0 ? `${errors} cards failed.` : ''}`,
            variant: "default",
          });
          onSuccess();
        } else {
          toast({
            title: "Import failed",
            description: "No cards were imported. Please check the file format.",
            variant: "destructive",
          });
        }
        
        setIsImporting(false);
      });
    } catch (error) {
      console.error("File reading error:", error);
      toast({
        title: "Error reading file",
        description: "There was an error reading the file. Please try again.",
        variant: "destructive",
      });
      setIsImporting(false);
    }
  };

  return (
    <div className="p-1">
      {!isImporting ? (
        <>
          <div 
            className="border-2 border-dashed border-gray-300 rounded-lg py-12 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => document.getElementById('ebay-file-upload')?.click()}
          >
            <input
              id="ebay-file-upload"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
            <Upload className="h-10 w-10 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">
              {fileSelected ? (
                <span className="font-medium text-blue-600">{fileSelected.name}</span>
              ) : (
                <span>Drag and drop an eBay bulk CSV file or click to browse</span>
              )}
            </p>
            <p className="mt-1 text-xs text-gray-500">CSV files only</p>
          </div>
          
          <div className="mt-6 flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={importCsvData} 
              disabled={!fileSelected}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Import Cards
            </Button>
          </div>
        </>
      ) : (
        <div className="py-6">
          <div className="mb-4">
            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${importProgress}%` }}
              />
            </div>
            <div className="mt-2 text-sm text-gray-500 flex justify-between">
              <span>Importing cards...</span>
              <span>{importProgress}%</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              <span>{importedCards} cards imported</span>
            </div>
            
            {errorCount > 0 && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <span>{errorCount} errors</span>
              </div>
            )}
            
            <div className="col-span-2 text-center text-gray-500 text-xs mt-2">
              {totalCards > 0 ? (
                <span>Processing {importedCards + errorCount} of {totalCards} cards</span>
              ) : (
                <span>Analyzing file...</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}