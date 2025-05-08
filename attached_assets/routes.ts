import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import { parse as csvParse } from "csv-parse";
import * as XLSX from "xlsx";
import { z } from "zod";
import { insertCardSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { scrapeEbayPrices } from "./services/priceService";
import { identifyCardFromImage, generateCardDescription } from "./services/imageRecognitionService";

// Configure multer for file uploads
const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ["text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
    if (allowedMimeTypes.includes(file.mimetype)) {
      return cb(null, true);
    }
    cb(new Error("Invalid file type. Only CSV and Excel files are allowed."));
  },
});

// Configure multer for image uploads
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowedMimeTypes.includes(file.mimetype)) {
      return cb(null, true);
    }
    cb(new Error("Invalid file type. Only JPEG, PNG, GIF and WEBP images are allowed."));
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all cards
  app.get("/api/cards", async (req: Request, res: Response) => {
    try {
      // Extract query parameters for filtering
      const { search, sport, year, brand, condition, sortBy } = req.query;
      
      const cards = await storage.getFilteredCards({
        search: search as string,
        sport: sport as string,
        year: year as string,
        brand: brand as string,
        condition: condition as string,
        sortBy: sortBy as string,
      });
      
      res.json(cards);
    } catch (error) {
      console.error("Error fetching cards:", error);
      res.status(500).json({ message: "Failed to fetch cards" });
    }
  });

  // Get a single card by ID
  app.get("/api/cards/:id", async (req: Request, res: Response) => {
    try {
      const cardId = parseInt(req.params.id, 10);
      const card = await storage.getCard(cardId);
      
      if (!card) {
        return res.status(404).json({ message: "Card not found" });
      }
      
      res.json(card);
    } catch (error) {
      console.error("Error fetching card:", error);
      res.status(500).json({ message: "Failed to fetch card" });
    }
  });

  // Create a new card
  app.post("/api/cards", async (req: Request, res: Response) => {
    try {
      const result = insertCardSchema.safeParse(req.body);
      
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }
      
      const newCard = await storage.createCard(result.data);
      res.status(201).json(newCard);
    } catch (error) {
      console.error("Error creating card:", error);
      res.status(500).json({ message: "Failed to create card" });
    }
  });

  // Update a card
  app.patch("/api/cards/:id", async (req: Request, res: Response) => {
    try {
      const cardId = parseInt(req.params.id, 10);
      
      // Validate request body against a partial schema
      const updateSchema = insertCardSchema.partial();
      const result = updateSchema.safeParse(req.body);
      
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({ message: validationError.message });
      }
      
      const updatedCard = await storage.updateCard(cardId, result.data);
      
      if (!updatedCard) {
        return res.status(404).json({ message: "Card not found" });
      }
      
      res.json(updatedCard);
    } catch (error) {
      console.error("Error updating card:", error);
      res.status(500).json({ message: "Failed to update card" });
    }
  });

  // Delete a card
  app.delete("/api/cards/:id", async (req: Request, res: Response) => {
    try {
      const cardId = parseInt(req.params.id, 10);
      const success = await storage.deleteCard(cardId);
      
      if (!success) {
        return res.status(404).json({ message: "Card not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting card:", error);
      res.status(500).json({ message: "Failed to delete card" });
    }
  });
  
  // Delete all cards (bulk delete)
  app.delete("/api/cards", async (req: Request, res: Response) => {
    try {
      const count = await storage.deleteAllCards();
      
      res.status(200).json({ 
        message: `Successfully deleted ${count} cards`, 
        count 
      });
    } catch (error) {
      console.error("Error deleting all cards:", error);
      res.status(500).json({ message: "Failed to delete all cards" });
    }
  });

  // Import cards from CSV/Excel
  app.post("/api/import", csvUpload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const { buffer, mimetype } = req.file;
      const { columnMap } = req.body;
      
      let mappedColumns: Record<string, string>;
      try {
        mappedColumns = JSON.parse(columnMap);
      } catch (e) {
        return res.status(400).json({ message: "Invalid column mapping" });
      }
      
      let records: any[] = [];
      
      // Parse CSV or Excel file
      if (mimetype === "text/csv") {
        const csvContent = buffer.toString("utf-8");
        
        // Parse CSV data
        const parsedCsv: any[] = await new Promise((resolve, reject) => {
          csvParse(csvContent, { columns: true, trim: true }, (err, output) => {
            if (err) return reject(err);
            resolve(output);
          });
        });
        
        records = parsedCsv;
      } else {
        // Parse Excel data
        const workbook = XLSX.read(buffer);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        records = XLSX.utils.sheet_to_json(worksheet);
      }
      
      // Map the records based on the provided column mapping
      const cardRecords = records.map(record => {
        const mappedRecord: any = {};
        
        for (const [cardField, fileField] of Object.entries(mappedColumns)) {
          if (fileField && fileField !== "none" && record[fileField] !== undefined) {
            mappedRecord[cardField] = record[fileField];
          }
        }
        
        // Convert numerical values
        if (mappedRecord.year) {
          mappedRecord.year = parseInt(mappedRecord.year);
        }
        
        if (mappedRecord.purchasePrice) {
          mappedRecord.purchasePrice = parseFloat(mappedRecord.purchasePrice);
        }
        
        if (mappedRecord.currentValue) {
          mappedRecord.currentValue = parseFloat(mappedRecord.currentValue);
        }
        
        return mappedRecord;
      });
      
      // Validate and insert each card
      const results = await Promise.all(
        cardRecords.map(async (record) => {
          try {
            const validationResult = insertCardSchema.safeParse(record);
            
            if (!validationResult.success) {
              return {
                success: false,
                error: `Validation error: ${record.playerName || "Unknown"} - ${fromZodError(validationResult.error).message}`,
                data: record,
              };
            }
            
            const card = await storage.createCard(validationResult.data);
            return { success: true, data: card };
          } catch (error) {
            return {
              success: false,
              error: `Error processing record: ${record.playerName || "Unknown"}`,
              data: record,
            };
          }
        })
      );
      
      // Count successes and failures
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      res.json({
        message: `Import completed: ${successful} cards imported, ${failed} failed`,
        results: results,
      });
    } catch (error) {
      console.error("Error importing cards:", error);
      res.status(500).json({ message: "Failed to import cards" });
    }
  });

  // New endpoint for fetching price data from eBay
  app.get("/api/prices", async (req: Request, res: Response) => {
    try {
      const { query } = req.query;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: "Search query is required" });
      }
      
      console.log(`Processing price search for: ${query}`);
      
      // Scrape eBay for price data
      const priceData = await scrapeEbayPrices(query);
      
      res.json(priceData);
    } catch (error) {
      console.error("Error fetching price data:", error);
      res.status(500).json({ message: "Failed to fetch price data" });
    }
  });

  // New endpoint for fetching price data for a specific card
  app.get("/api/cards/:id/price", async (req: Request, res: Response) => {
    try {
      const cardId = parseInt(req.params.id, 10);
      const card = await storage.getCard(cardId);
      
      if (!card) {
        return res.status(404).json({ message: "Card not found" });
      }
      
      // Generate search query for this card
      const parts = [];
      
      // Build search query from card details
      if (card.playerName) parts.push(card.playerName);
      if (card.cardSet) parts.push(card.cardSet);
      if (card.cardNumber) parts.push(`#${card.cardNumber}`);
      if (card.notes) parts.push(card.notes);
      if (card.year) parts.push(card.year.toString());
      if (card.brand) parts.push(card.brand);
      
      // Join all parts into a search query, removing any duplicates
      const uniqueParts = Array.from(new Set(parts.filter(Boolean)));
      const searchQuery = uniqueParts.join(" ");
      
      console.log(`Fetching price data for card #${cardId}: ${searchQuery}`);
      
      // Use our price service to get data
      const priceData = await scrapeEbayPrices(searchQuery);
      
      res.json(priceData);
    } catch (error) {
      console.error("Error fetching card price data:", error);
      res.status(500).json({ message: "Failed to fetch card price data" });
    }
  });
  
  // Endpoint for card image recognition
  app.post("/api/recognize-card", imageUpload.single("image"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image uploaded" });
      }
      
      const { buffer, mimetype } = req.file;
      
      // Convert buffer to base64
      const base64Image = buffer.toString('base64');
      
      // Log image recognition request
      console.log(`Processing card image recognition request (${buffer.length} bytes, ${mimetype})`);
      
      // Use Claude to identify the card from the image
      const result = await identifyCardFromImage(base64Image, mimetype);
      
      if (!result.success) {
        return res.status(422).json({ 
          message: result.error || "Failed to recognize card from image",
          partialData: result.card
        });
      }
      
      // If image recognition was successful, return the card data
      if (result.card && result.card.playerName) {
        // Generate a description if we have enough information
        if (result.card.playerName && result.card.sport && result.card.year) {
          const description = await generateCardDescription(result.card);
          if (description) {
            result.card.notes = description;
          }
        }
      }
      
      res.json({
        message: "Card successfully recognized from image",
        card: result.card
      });
    } catch (error) {
      console.error("Error recognizing card from image:", error);
      res.status(500).json({ message: "Failed to process card image" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
