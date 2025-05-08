import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { parse } from "csv-parse/browser/esm";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { parseCSVHeaders, parseExcelHeaders } from "@/lib/utils";
import SuccessAnimation from "./SuccessAnimation";

interface CsvImporterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function CsvImporter({ open, onOpenChange, onSuccess }: CsvImporterProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [uploading, setUploading] = useState<boolean>(false);
  const [headers, setHeaders] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [totalImported, setTotalImported] = useState<number>(0);

  const importMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return fetch('/api/import', {
        method: 'POST',
        body: formData,
      }).then(res => {
        if (!res.ok) {
          throw new Error('Import failed');
        }
        return res.json();
      });
    },
    onSuccess: (data) => {
      setTotalImported(data.imported || 0);
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

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setHeaders([]);
    
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      setFile(selectedFile);
      setFileName(selectedFile.name);

      // Try to parse headers
      try {
        setUploading(true);
        
        if (selectedFile.name.endsWith('.csv')) {
          const headers = await parseCSVHeaders(selectedFile);
          setHeaders(headers);
        } else if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
          const headers = await parseExcelHeaders(selectedFile);
          setHeaders(headers);
        }
      } catch (error) {
        console.error('Error parsing file headers:', error);
        toast({
          variant: "destructive",
          title: "Error Reading File",
          description: "Could not read the file headers. Please check the file format.",
        });
      } finally {
        setUploading(false);
      }
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast({
        variant: "destructive",
        title: "No File Selected",
        description: "Please select a file to import.",
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    importMutation.mutate(formData);
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
        <Label htmlFor="csv-import">Upload CSV or Excel File</Label>
        <div className="flex items-center gap-2">
          <input
            id="csv-import"
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button 
            variant="outline" 
            onClick={() => document.getElementById('csv-import')?.click()}
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
                Click to select a file
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
          <span className="ml-2">Reading file...</span>
        </div>
      )}

      {headers.length > 0 && (
        <div className="space-y-2">
          <Label>Detected columns:</Label>
          <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto p-2 border rounded-md">
            {headers.map((header, index) => (
              <div key={index} className="text-sm bg-secondary/10 p-1 rounded">
                {header}
              </div>
            ))}
          </div>
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
          disabled={!file || importMutation.isPending || uploading}
        >
          {importMutation.isPending ? (
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
  );
}