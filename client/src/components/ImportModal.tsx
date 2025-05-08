import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import CsvImporter from "./CsvImporter";
import EbayImporter from "./EbayImporter";
import AdvancedImporter from "./AdvancedImporter";

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function ImportModal({ open, onOpenChange, onSuccess }: ImportModalProps) {
  const [importType, setImportType] = useState<"csv" | "ebay" | "advanced" | null>(null);

  // Reset the import type when the dialog is closed
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setImportType(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Cards</DialogTitle>
          <DialogDescription>
            Choose a method to import your cards to the collection.
          </DialogDescription>
        </DialogHeader>

        {!importType ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="flex flex-col items-center justify-center h-28 p-4"
              onClick={() => setImportType("csv")}
            >
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
                <path d="M8 13h2" />
                <path d="M8 17h2" />
                <path d="M14 13h2" />
                <path d="M14 17h2" />
              </svg>
              CSV Import
            </Button>

            <Button
              variant="outline"
              className="flex flex-col items-center justify-center h-28 p-4"
              onClick={() => setImportType("ebay")}
            >
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
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <path d="M3 6h18" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              eBay Import
            </Button>

            <Button
              variant="outline"
              className="flex flex-col items-center justify-center h-28 p-4"
              onClick={() => setImportType("advanced")}
            >
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
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
              </svg>
              Advanced
            </Button>
          </div>
        ) : importType === "csv" ? (
          <CsvImporter
            open={true}
            onOpenChange={() => setImportType(null)}
            onSuccess={onSuccess}
          />
        ) : importType === "ebay" ? (
          <EbayImporter
            open={true}
            onOpenChange={() => setImportType(null)}
            onSuccess={onSuccess}
          />
        ) : (
          <AdvancedImporter
            open={true}
            onOpenChange={() => setImportType(null)}
            onSuccess={onSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}