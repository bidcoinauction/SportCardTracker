import { useState } from "react";

interface AdvancedImporterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function AdvancedImporter({ open, onOpenChange, onSuccess }: AdvancedImporterProps) {
  return (
    <div className="p-6 text-center">
      <h3 className="text-lg font-medium mb-2">Advanced CSV Import</h3>
      <p className="text-sm text-gray-500 mb-4">
        This feature allows you to import CSV files with custom column mapping.
        Coming soon...
      </p>
    </div>
  );
}