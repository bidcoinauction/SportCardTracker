import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient"; 
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Check, AlertCircle, Upload, ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";

export default function Import() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();
  const [_, navigate] = useLocation();

  const importMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/import", {
        method: "POST",
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Import failed");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setResults(data);
      queryClient.invalidateQueries({ queryKey: ["/api/cards"] });
      toast({
        title: "Import completed",
        description: `${data.results.filter((r: any) => r.success).length} cards imported successfully.`,
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Import failed",
        description: error.message || "There was an error importing your cards.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setUploading(false);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setResults(null);

    // Create a column mapping for the CSV/Excel file
    // This maps fields in the CSV to our database schema
    const columnMap = {
      playerName: "playerName",
      sport: "sport",
      year: "year",
      brand: "brand",
      cardSet: "cardSet",
      condition: "condition",
      purchasePrice: "purchasePrice",
      currentValue: "currentValue",
      notes: "notes",
      cardNumber: "cardNumber"
    };

    const formData = new FormData();
    formData.append("file", file);
    formData.append("columnMap", JSON.stringify(columnMap));

    importMutation.mutate(formData);
  };

  const handleViewCollection = () => {
    navigate("/collection");
  };

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Import Cards</h1>
            <p className="text-muted-foreground">
              Import your card collection from a CSV or Excel file
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Upload File</CardTitle>
              <CardDescription>
                Select a CSV or Excel file containing your card collection.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="file">File</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                    disabled={uploading}
                  />
                  <p className="text-sm text-muted-foreground">
                    Accepted formats: CSV, Excel (.xlsx, .xls)
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => navigate("/collection")}>
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!file || uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Import Cards
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>File Format</CardTitle>
              <CardDescription>
                Your CSV or Excel file should contain these column headers:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-1 text-sm">
                <div className="flex items-center py-1">
                  <Check className="mr-2 h-4 w-4 text-green-500" />
                  <span className="font-medium">playerName</span> - Name of the player
                </div>
                <div className="flex items-center py-1">
                  <Check className="mr-2 h-4 w-4 text-green-500" />
                  <span className="font-medium">sport</span> - Sport (soccer, basketball, etc.)
                </div>
                <div className="flex items-center py-1">
                  <Check className="mr-2 h-4 w-4 text-green-500" />
                  <span className="font-medium">year</span> - Year of the card
                </div>
                <div className="flex items-center py-1">
                  <Check className="mr-2 h-4 w-4 text-green-500" />
                  <span className="font-medium">brand</span> - Brand of the card (Topps, Panini, etc.)
                </div>
                <div className="flex items-center py-1">
                  <Check className="mr-2 h-4 w-4 text-green-500" />
                  <span className="font-medium">cardSet</span> - Card set or series
                </div>
                <div className="flex items-center py-1">
                  <Check className="mr-2 h-4 w-4 text-green-500" />
                  <span className="font-medium">condition</span> - Condition of the card
                </div>
                <div className="flex items-center py-1">
                  <Check className="mr-2 h-4 w-4 text-green-500" />
                  <span className="font-medium">purchasePrice</span> - Purchase price
                </div>
                <div className="flex items-center py-1">
                  <Check className="mr-2 h-4 w-4 text-green-500" />
                  <span className="font-medium">currentValue</span> - Current value
                </div>
                <div className="flex items-center py-1">
                  <Check className="mr-2 h-4 w-4 text-green-500" />
                  <span className="font-medium">notes</span> - Additional notes
                </div>
                <div className="flex items-center py-1">
                  <Check className="mr-2 h-4 w-4 text-green-500" />
                  <span className="font-medium">cardNumber</span> - Card number
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {results && (
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Import Results</CardTitle>
                <CardDescription>
                  {results.message}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {results.results.filter((r: any) => !r.success).length > 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Failed to import some cards</AlertTitle>
                      <AlertDescription>
                        {results.results.filter((r: any) => !r.success).length} cards could not be imported.
                        Check the format of your file and try again.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex justify-end space-x-2">
                    <Button
                      onClick={handleViewCollection}
                      variant="default"
                    >
                      View Collection
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}