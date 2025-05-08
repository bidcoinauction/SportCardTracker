import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { parse } from "csv-parse/browser/esm";
import * as XLSX from 'xlsx';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a price value
 */
export function formatPrice(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '$0.00';
  
  const numberValue = typeof value === 'string' ? parseFloat(value) : value;
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numberValue);
}

/**
 * Get a color for a sport badge
 */
export function getSportBadgeColor(sport: string): string {
  const sportColors: Record<string, string> = {
    basketball: 'bg-blue-600',
    baseball: 'bg-green-600',
    football: 'bg-red-600',
    soccer: 'bg-purple-600',
    hockey: 'bg-slate-600'
  };
  
  return sportColors[sport.toLowerCase()] || 'bg-gray-600';
}

/**
 * Clean up card notes for display
 */
export function cleanCardNotes(notes: string): string {
  if (!notes) return '';
  
  // Truncate long notes for display
  if (notes.length > 100) {
    return notes.substring(0, 97) + '...';
  }
  
  return notes;
}

/**
 * Parse CSV file headers
 */
export async function parseCSVHeaders(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (!event.target || !event.target.result) {
        reject(new Error('Failed to read file'));
        return;
      }
      
      const content = event.target.result.toString();
      const lines = content.split('\n');
      
      if (lines.length === 0) {
        reject(new Error('CSV file appears to be empty'));
        return;
      }
      
      // Extract the headers (first line)
      parse(lines[0], { delimiter: ',' }, (err, output) => {
        if (err) {
          reject(err);
          return;
        }
        
        // The output is a 2D array, the first row contains the headers
        if (output && output.length > 0) {
          resolve(output[0]);
        } else {
          reject(new Error('No headers found in CSV file'));
        }
      });
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Parse Excel file headers
 */
export async function parseExcelHeaders(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (!event.target || !event.target.result) {
        reject(new Error('Failed to read file'));
        return;
      }
      
      try {
        const data = new Uint8Array(event.target.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get the first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON to get the headers
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData && jsonData.length > 0 && Array.isArray(jsonData[0])) {
          // The first row contains the headers
          resolve(jsonData[0] as string[]);
        } else {
          reject(new Error('No headers found in Excel file'));
        }
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}
