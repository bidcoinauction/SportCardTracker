import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, InsertCard } from "@shared/schema";
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertCircle, CheckCircle, Info } from "lucide-react";
import { parseExcelHeaders } from "@/lib/utils";
import SuccessAnimation from "./SuccessAnimation";
import { Label } from "@/components/ui/label";
import * as XLSX from 'xlsx';

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
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [uploading, setUploading] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [totalImported, setTotalImported] = useState<number>(0);
  
  // The cards that were parsed from the file
  const [parsedCards, setParsedCards] = useState<InsertCard[]>([]);
  
  // The columns that were mapped from the eBay spreadsheet
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});

  const importMutation = useMutation({
    mutationFn: async (cards: InsertCard[]) => {
      return fetch('/api/cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cards }),
      }).then(res => {
        if (!res.ok) {
          throw new Error('Import failed');
        }
        return res.json();
      });
    },
    onSuccess: (data) => {
      setTotalImported(data.imported || parsedCards.length);
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

  // Maps eBay spreadsheet data to our card schema
  const mapEbayRowToCard = (row: EbayCardRow): InsertCard => {
    const card: Partial<InsertCard> = {
      playerName: row["C:Player/Athlete"] || row["C:Card Name"] || extractPlayerFromTitle(row.Title),
      sport: (row["C:Sport"] || "").toLowerCase(),
      year: parseInt(row["C:Year Manufactured"]) || extractYearFromTitle(row.Title),
      brand: row["C:Manufacturer"] || null,
      cardSet: row["C:Set"] || null,
      cardNumber: row["C:Card Number"] || extractCardNumberFromTitle(row.Title),
      condition: mapEbayConditionToSchema(row.ConditionID, row["C:ConditionDescription"] || row.ConditionDescription),
      currentValue: extractPriceFromTitle(row.Title) || null,
      purchasePrice: null,
      notes: `Imported from eBay: ${row.Title}`,
      team: row["C:Team"] || null,
      frontImageUrl: row.PicURL || null,
      backImageUrl: null,
      createdAt: new Date().toISOString(),
    };
    
    return card as InsertCard;
  };
  
  // Extract player name from eBay title
  const extractPlayerFromTitle = (title: string): string => {
    // Implementation would depend on title patterns
    return title.split(' ').slice(0, 2).join(' ');
  };
  
  // Extract year from eBay title
  const extractYearFromTitle = (title: string): number => {
    const yearMatch = title.match(/\b(19|20)\d{2}\b/);
    return yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();
  };
  
  // Extract card number from eBay title
  const extractCardNumberFromTitle = (title: string): string | null => {
    const numberMatch = title.match(/#(\d+)/);
    return numberMatch ? numberMatch[1] : null;
  };
  
  // Extract price from eBay title (if available)
  const extractPriceFromTitle = (title: string): number | null => {
    const priceMatch = title.match(/\$(\d+(\.\d{2})?)/);
    return priceMatch ? parseFloat(priceMatch[1]) : null;
  };
  
  // Map eBay condition to our schema's condition
  const mapEbayConditionToSchema = (conditionId: string, conditionDesc: string): string => {
    if (!conditionId && !conditionDesc) return "unknown";
    
    // Examples of mapping logic
    if (conditionDesc.includes("Mint") || conditionId === "10") return "mint";
    if (conditionDesc.includes("Near Mint") || conditionId === "9") return "nearMint";
    if (conditionDesc.includes("Excellent") || conditionId === "8") return "excellent";
    if (conditionDesc.includes("Very Good") || conditionId === "7") return "veryGood";
    if (conditionDesc.includes("Good") || conditionId === "6") return "good";
    if (conditionDesc.includes("Fair") || conditionId === "5") return "fair";
    if (conditionDesc.includes("Poor") || conditionId === "4") return "poor";
    
    return "unknown";
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setParsedCards([]);
    setParseError(null);
    
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      setFile(selectedFile);
      setFileName(selectedFile.name);

      // Try to parse the file
      try {
        setUploading(true);
        
        if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
          await parseEbayExcelFile(selectedFile);
        } else {
          throw new Error("Unsupported file format. Please upload an Excel file (.xlsx, .xls).");
        }
      } catch (error) {
        console.error('Error parsing file:', error);
        setParseError((error as Error).message);
        toast({
          variant: "destructive",
          title: "Error Reading File",
          description: (error as Error).message || "Could not read the file. Please check the format.",
        });
      } finally {
        setUploading(false);
      }
    }
  };

  const parseEbayExcelFile = async (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          if (!e.target || !e.target.result) {
            reject(new Error("Failed to read file"));
            return;
          }

          const data = new Uint8Array(e.target.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Get the first sheet
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });
          
          if (!jsonData || jsonData.length === 0) {
            reject(new Error("No data found in the spreadsheet"));
            return;
          }
          
          // Process the data into card format
          try {
            const cards = (jsonData as EbayCardRow[]).map(mapEbayRowToCard);
            setParsedCards(cards);
            resolve();
          } catch (err) {
            reject(new Error("Error processing eBay data. Please check the file format."));
          }
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error("Error reading file"));
      };
      
      reader.readAsArrayBuffer(file);
    });
  };

  const handleImport = () => {
    if (parsedCards.length === 0) {
      toast({
        variant: "destructive",
        title: "No Cards to Import",
        description: "Please upload and parse a valid eBay file first.",
      });
      return;
    }

    importMutation.mutate(parsedCards);
  };

  if (showSuccess) {
    return (
      <SuccessAnimation 
        message={`Successfully imported ${totalImported} cards!`}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="ebay-import">Upload eBay File Export</Label>
        <p className="text-sm text-gray-500 mb-2">
          Upload an Excel file exported from eBay with your card listings.
        </p>
        
        <div className="flex items-center gap-2">
          <input
            id="ebay-import"
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button 
            variant="outline" 
            onClick={() => document.getElementById('ebay-import')?.click()}
            className="w-full h-24 border-dashed flex flex-col items-center justify-center"
            disabled={importMutation.isPending || uploading}
          >
            {!fileName ? (
              <>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="mb-2"
                >
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                Click to select eBay file
              </>
            ) : (
              <>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="mb-2"
                >
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <line x1="10" y1="9" x2="8" y2="9" />
                </svg>
                {fileName}
              </>
            )}
          </Button>
        </div>
      </div>

      {uploading && (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Processing eBay file...</span>
        </div>
      )}

      {parseError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-red-800">Error parsing file</h4>
            <p className="text-sm text-red-700 mt-1">{parseError}</p>
          </div>
        </div>
      )}

      {parsedCards.length > 0 && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-md p-4 flex items-start">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-green-800">Successfully parsed {parsedCards.length} cards</h4>
              <p className="text-sm text-green-700 mt-1">
                Review the cards below before importing to your collection.
              </p>
            </div>
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Brand/Set</TableHead>
                  <TableHead>Sport</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Card #</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedCards.slice(0, 5).map((card, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{card.playerName}</TableCell>
                    <TableCell>{card.year}</TableCell>
                    <TableCell>{card.brand} {card.cardSet}</TableCell>
                    <TableCell className="capitalize">{card.sport}</TableCell>
                    <TableCell>{card.condition}</TableCell>
                    <TableCell>{card.cardNumber || "-"}</TableCell>
                  </TableRow>
                ))}
                {parsedCards.length > 5 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-gray-500">
                      ... and {parsedCards.length - 5} more cards
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="field-mapping">
              <AccordionTrigger>
                <div className="flex items-center">
                  <Info className="h-4 w-4 mr-2" />
                  Field Mapping Information
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="text-sm space-y-2">
                  <p>The following fields were mapped from your eBay export:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Player Name:</strong> C:Player/Athlete or extracted from Title</li>
                    <li><strong>Sport:</strong> C:Sport (converted to lowercase)</li>
                    <li><strong>Year:</strong> C:Year Manufactured or extracted from Title</li>
                    <li><strong>Brand:</strong> C:Manufacturer</li>
                    <li><strong>Set:</strong> C:Set</li>
                    <li><strong>Condition:</strong> Mapped from ConditionID and ConditionDescription</li>
                    <li><strong>Card Number:</strong> C:Card Number or extracted from Title</li>
                    <li><strong>Image:</strong> PicURL (first image only)</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button 
          variant="outline" 
          onClick={() => onOpenChange(false)}
          disabled={importMutation.isPending}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleImport} 
          disabled={parsedCards.length === 0 || importMutation.isPending || uploading}
        >
          {importMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Importing {parsedCards.length} cards...
            </>
          ) : (
            `Import ${parsedCards.length} Cards`
          )}
        </Button>
      </div>
    </div>
  );
}