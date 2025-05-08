import { 
  Dialog, 
  DialogContent, 
  DialogDescription,
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import CsvImporter from "./CsvImporter";

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function ImportModal({ open, onOpenChange, onSuccess }: ImportModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl">
        <DialogHeader>
          <DialogTitle>Import Cards</DialogTitle>
          <DialogDescription>
            Import your trading cards from a CSV file.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          <CsvImporter 
            open={open} 
            onOpenChange={onOpenChange} 
            onSuccess={onSuccess} 
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}