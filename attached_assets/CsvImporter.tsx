import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { parseCSVHeaders, parseExcelHeaders } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { UploadIcon } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

interface CsvImporterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function CsvImporter({ open, onOpenChange, onSuccess }: CsvImporterProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({
    playerName: "none",
    sport: "none",
    year: "none",
    brand: "none",
    condition: "none",
    purchasePrice: "none",
    cardSet: "none",
    cardNumber: "none",
    notes: "none",
    imageUrl: "none",
  });
  const [isUploading, setIsUploading] = useState(false);
  
  const handleFileChange = async (file: File) => {
    setFile(file);
    
    try {
      let headers: string[] = [];
      
      // Extract headers based on file type
      if (file.name.endsWith('.csv')) {
        headers = await parseCSVHeaders(file);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        headers = await parseExcelHeaders(file);
      }
      
      setFileHeaders(headers);
      
      // Auto-map columns based on header names if possible
      const newMapping = { ...columnMapping };
      const fieldMappings: Record<string, string[]> = {
        playerName: ['player', 'player name', 'name', 'player_name', 'player name'],
        sport: ['sport', 'type', 'category'],
        year: ['year', 'season', 'yr', 'season'],
        brand: ['brand', 'manufacturer', 'company'],
        condition: ['condition', 'quality', 'grade'],
        purchasePrice: ['price', 'purchase price', 'cost', 'value', 'purchase_price'],
        cardSet: ['set', 'card set', 'series', 'collection', 'card_set', 'features'],
        cardNumber: ['number', 'card number', 'card #', 'card_number', 'id', 'card number'],
        notes: ['card name', 'notes', 'description', 'comment', 'comments', 'team', 'league'],
        imageUrl: ['image', 'image url', 'image_url', 'pic', 'picture', 'photo', 'pic url', 'picurl', 'image link', 'image url']
      };
      
      // Try to map headers automatically
      headers.forEach(header => {
        const lowerHeader = header.toLowerCase().trim();
        
        // Special case for eBay bulk fields
        if (lowerHeader === 'card name') {
          newMapping.notes = header;
        } else if (lowerHeader === 'player/athlete' || lowerHeader === 'player name') {
          newMapping.playerName = header;
        } else if (lowerHeader === 'sport') {
          newMapping.sport = header;
        } else if (lowerHeader === 'card number') {
          newMapping.cardNumber = header;
        } else if (lowerHeader === 'features') {
          newMapping.cardSet = header;
        } else if (lowerHeader === 'image url') {
          newMapping.imageUrl = header;
        } else if (lowerHeader === 'league') {
          // Store as notes if not already set
          if (newMapping.notes === 'none') {
            newMapping.notes = header;
          }
        } else if (lowerHeader === 'team') {
          // Add to notes if needed
          if (newMapping.notes === 'none') {
            newMapping.notes = header;
          }
        } else if (lowerHeader === 'season') {
          newMapping.year = header;
        } else if (lowerHeader === 'condition') {
          newMapping.condition = header;
        } else if (lowerHeader === 'brand' || lowerHeader === 'manufacturer') {
          newMapping.brand = header;
        } else {
          // Fall back to the general matching
          for (const [field, possibleMatches] of Object.entries(fieldMappings)) {
            if (possibleMatches.includes(lowerHeader)) {
              newMapping[field] = header;
            }
          }
        }
      });
      
      setColumnMapping(newMapping);
    } catch (error) {
      console.error('Error parsing file:', error);
      toast({
        title: 'Error parsing file',
        description: 'Please check the file format and try again.',
        variant: 'destructive',
      });
    }
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      handleFileChange(droppedFile);
    }
  };
  
  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };
  
  const handleInputFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileChange(e.target.files[0]);
    }
  };
  
  const handleColumnMappingChange = (field: string, value: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [field]: value,
    }));
  };
  
  const handleImport = async () => {
    if (!file) {
      toast({
        title: 'No file selected',
        description: 'Please select a file to import.',
        variant: 'destructive',
      });
      return;
    }
    
    // Check if required fields are mapped
    const requiredFields = ['playerName', 'sport', 'year', 'brand', 'condition'];
    const missingFields = requiredFields.filter(field => columnMapping[field] === "none");
    
    if (missingFields.length > 0) {
      toast({
        title: 'Missing required mappings',
        description: `Please map the following fields: ${missingFields.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setIsUploading(true);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('columnMap', JSON.stringify(columnMapping));
      
      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Import failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Close modal and notify success
      onOpenChange(false);
      setFile(null);
      setFileHeaders([]);
      setColumnMapping({
        playerName: "none",
        sport: "none",
        year: "none",
        brand: "none",
        condition: "none",
        purchasePrice: "none",
        cardSet: "none",
        cardNumber: "none",
        notes: "none",
        imageUrl: "none",
      });
      
      // Count successful imports
      const successCount = result.results.filter((r: any) => r.success).length;
      
      toast({
        title: 'Import successful',
        description: `${successCount} cards have been imported.`,
      });
      
      // Invalidate the cards query to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/cards'] });
      onSuccess();
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <div 
        className={`border-2 ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-dashed border-gray-300'} rounded-lg cursor-pointer`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleSelectFile}
      >
        <div className="flex flex-col items-center justify-center py-8 px-4">
          <UploadIcon className="h-10 w-10 text-gray-400 mb-3" />
          <p className="text-center text-sm">
            <span className="font-medium text-blue-600">Click to upload</span> or drag and drop<br />
            CSV, XLS or XLSX (max 10MB)
          </p>
          <input 
            ref={fileInputRef}
            type="file" 
            className="hidden" 
            accept=".csv,.xls,.xlsx"
            onChange={handleInputFileChange}
          />
        </div>
      </div>
      
      {file && (
        <div className="mt-2 flex items-center space-x-2">
          <span className="text-sm text-gray-600">Selected file:</span>
          <span className="text-sm font-medium">{file.name}</span>
        </div>
      )}
      
      {/* Column Mapping */}
      {fileHeaders.length > 0 && (
        <div className="mt-6">
          <h4 className="font-medium text-gray-900 mb-3">Map Your Columns</h4>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="playerName-mapping">Player Name *</Label>
                <Select 
                  value={columnMapping.playerName} 
                  onValueChange={(value) => handleColumnMappingChange('playerName', value)}
                >
                  <SelectTrigger id="playerName-mapping">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Select column --</SelectItem>
                    {fileHeaders.map(header => (
                      <SelectItem key={header} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="sport-mapping">Sport *</Label>
                <Select 
                  value={columnMapping.sport} 
                  onValueChange={(value) => handleColumnMappingChange('sport', value)}
                >
                  <SelectTrigger id="sport-mapping">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Select column --</SelectItem>
                    {fileHeaders.map(header => (
                      <SelectItem key={header} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="year-mapping">Year *</Label>
                <Select 
                  value={columnMapping.year} 
                  onValueChange={(value) => handleColumnMappingChange('year', value)}
                >
                  <SelectTrigger id="year-mapping">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Select column --</SelectItem>
                    {fileHeaders.map(header => (
                      <SelectItem key={header} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="brand-mapping">Brand *</Label>
                <Select 
                  value={columnMapping.brand} 
                  onValueChange={(value) => handleColumnMappingChange('brand', value)}
                >
                  <SelectTrigger id="brand-mapping">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Select column --</SelectItem>
                    {fileHeaders.map(header => (
                      <SelectItem key={header} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="condition-mapping">Condition *</Label>
                <Select 
                  value={columnMapping.condition} 
                  onValueChange={(value) => handleColumnMappingChange('condition', value)}
                >
                  <SelectTrigger id="condition-mapping">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Select column --</SelectItem>
                    {fileHeaders.map(header => (
                      <SelectItem key={header} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="price-mapping">Purchase Price (optional)</Label>
                <Select 
                  value={columnMapping.purchasePrice} 
                  onValueChange={(value) => handleColumnMappingChange('purchasePrice', value)}
                >
                  <SelectTrigger id="price-mapping">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Select column --</SelectItem>
                    {fileHeaders.map(header => (
                      <SelectItem key={header} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="cardSet-mapping">Card Set (optional)</Label>
                <Select 
                  value={columnMapping.cardSet} 
                  onValueChange={(value) => handleColumnMappingChange('cardSet', value)}
                >
                  <SelectTrigger id="cardSet-mapping">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Select column --</SelectItem>
                    {fileHeaders.map(header => (
                      <SelectItem key={header} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="cardNumber-mapping">Card Number (optional)</Label>
                <Select 
                  value={columnMapping.cardNumber} 
                  onValueChange={(value) => handleColumnMappingChange('cardNumber', value)}
                >
                  <SelectTrigger id="cardNumber-mapping">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Select column --</SelectItem>
                    {fileHeaders.map(header => (
                      <SelectItem key={header} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="notes-mapping">Card Name (optional)</Label>
              <Select 
                value={columnMapping.notes} 
                onValueChange={(value) => handleColumnMappingChange('notes', value)}
              >
                <SelectTrigger id="notes-mapping">
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Select column --</SelectItem>
                  {fileHeaders.map(header => (
                    <SelectItem key={header} value={header}>{header}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="mt-4">
              <Label htmlFor="imageUrl-mapping">Image URL (optional)</Label>
              <Select 
                value={columnMapping.imageUrl} 
                onValueChange={(value) => handleColumnMappingChange('imageUrl', value)}
              >
                <SelectTrigger id="imageUrl-mapping">
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Select column --</SelectItem>
                  {fileHeaders.map(header => (
                    <SelectItem key={header} value={header}>{header}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end space-x-2">
            <Button 
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleImport}
              disabled={isUploading || !file || fileHeaders.length === 0}
              className={isUploading ? 'opacity-50 cursor-not-allowed' : ''}
            >
              {isUploading ? 'Importing...' : 'Import Cards'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}